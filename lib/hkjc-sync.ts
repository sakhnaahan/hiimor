import { prisma } from "@/lib/prisma";
import {
  getLiveHkjcUpcomingRaceCard,
  isLocalMainRaceCard,
  isMainHkjcRacecourse,
  isUsableHkjcRaceCard,
  type HkjcRaceCard,
} from "@/lib/hkjc-racecard";
import { readStoredHkjcRaceResult, storeHkjcRaceResult, upsertHkjcRaceCardSnapshot } from "@/lib/hkjc-snapshots";
import { getHkjcRaceResult } from "@/lib/hkjc-results";
import { settlePendingHkjcBets } from "@/lib/hkjc-settlement";

const HKJC_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";
const HKJC_FETCH_TIMEOUT_MS = 10_000;
const HKJC_SYNC_LOCK_KEY = 904211;

const ACTIVE_MEETINGS_QUERY = `
query activeMainMeetings {
  raceMeetings {
    venueCode
    date
    currentNumberOfRace
    totalNumberOfRace
    races {
      no
      status
      runners {
        no
      }
    }
  }
}
`;

type ActiveMeetingResponse = {
  data?: {
    raceMeetings?: Array<{
      venueCode?: string | null;
      date?: string | null;
      currentNumberOfRace?: number | null;
      totalNumberOfRace?: number | null;
      races?: Array<{
        no?: number | null;
        status?: string | null;
        runners?: Array<{ no?: string | null }> | null;
      }> | null;
    }> | null;
  };
};

export type ActiveMainMeeting = {
  raceDate: string;
  racecourseCode: string;
  currentRaceNo: number | null;
  raceCount: number;
  activeRaceNos: number[];
};

export type HkjcSyncSummary = {
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  meetingsScanned: number;
  racesUpserted: number;
  oddsRefreshed: number;
  resultsFinalized: number;
  betsSettled: number;
  failureMessage?: string;
};

function isRaceStillActive(status?: string | null) {
  return !["RESULT", "CLOSED"].includes(String(status ?? "").toUpperCase());
}

export function extractActiveMainHkjcMeetings(json: ActiveMeetingResponse): ActiveMainMeeting[] {
  return (json.data?.raceMeetings ?? [])
    .filter((meeting) => isMainHkjcRacecourse(meeting.venueCode))
    .map((meeting) => {
      const activeRaceNos = (meeting.races ?? [])
        .filter((race) => Number.isInteger(race.no) && isRaceStillActive(race.status) && (race.runners?.length ?? 0) > 0)
        .map((race) => Number(race.no))
        .sort((left, right) => left - right);

      return {
        raceDate: String(meeting.date ?? ""),
        racecourseCode: String(meeting.venueCode ?? ""),
        currentRaceNo: meeting.currentNumberOfRace ?? null,
        raceCount: Number(meeting.totalNumberOfRace ?? activeRaceNos.length ?? 0),
        activeRaceNos,
      };
    })
    .filter((meeting) => meeting.raceDate && meeting.racecourseCode && meeting.activeRaceNos.length > 0);
}

export function canFinalizeHkjcRace(raceDate: string, startTime: string, now = Date.now()) {
  if (!raceDate || !startTime) {
    return false;
  }

  const raceTime = new Date(`${raceDate.replaceAll("/", "-")}T${startTime}:00+08:00`);
  return Number.isFinite(raceTime.getTime()) && now >= raceTime.getTime();
}

function normalizeRaceDate(value: string) {
  return value.replace(/-/g, "/");
}

function matchesMeetingRace(raceCard: HkjcRaceCard, meeting: ActiveMainMeeting, raceNo: number) {
  return (
    normalizeRaceDate(raceCard.raceDate) === normalizeRaceDate(meeting.raceDate) &&
    raceCard.racecourseCode === meeting.racecourseCode &&
    raceCard.raceNo === raceNo
  );
}

export function isSyncableRaceCardForMeeting(
  raceCard: HkjcRaceCard,
  meeting: ActiveMainMeeting,
  raceNo: number,
) {
  return matchesMeetingRace(raceCard, meeting, raceNo) && isUsableHkjcRaceCard(raceCard);
}

async function fetchActiveMainMeetings() {
  const response = await fetch(HKJC_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://bet.hkjc.com",
      referer: "https://bet.hkjc.com/en/racing/pwin",
      "user-agent": "Mozilla/5.0 (compatible; private-horse-race/0.1; +https://bet.hkjc.com)",
    },
    signal: AbortSignal.timeout(HKJC_FETCH_TIMEOUT_MS),
    body: JSON.stringify({ query: ACTIVE_MEETINGS_QUERY }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ActiveMeetingResponse;
}

async function tryAcquireSyncLock() {
  const rows = await prisma.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_lock(${HKJC_SYNC_LOCK_KEY}) AS locked`;
  return rows[0]?.locked ?? false;
}

async function releaseSyncLock() {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(${HKJC_SYNC_LOCK_KEY})`;
}

async function syncActiveMeetings(summary: HkjcSyncSummary, meetings: ActiveMainMeeting[]) {
  for (const meeting of meetings) {
    const seed = await getLiveHkjcUpcomingRaceCard({
      raceDate: meeting.raceDate,
      racecourse: meeting.racecourseCode,
    }).catch(() => null);

    const raceNos =
      seed?.ok && seed.raceCard.raceOptions.length > 0
        ? [...new Set(seed.raceCard.raceOptions.map((option) => option.raceNo))]
        : meeting.activeRaceNos;

    for (const raceNo of raceNos) {
      const raceCardResult =
        seed?.ok && seed.raceCard.raceNo === raceNo
          ? seed
          : await getLiveHkjcUpcomingRaceCard({
              raceDate: meeting.raceDate,
              racecourse: meeting.racecourseCode,
              raceNo,
            }).catch(() => null);

      if (!raceCardResult?.ok) {
        continue;
      }

      const raceCard = raceCardResult.raceCard;
      if (!isSyncableRaceCardForMeeting(raceCard, meeting, raceNo)) {
        continue;
      }

      await upsertHkjcRaceCardSnapshot(raceCard, {
        meetingStatus: raceNo === meeting.currentRaceNo ? "RUNNING" : "OPEN",
        raceStatus: isLocalMainRaceCard(raceCard)
          ? "FALLBACK"
          : raceNo === meeting.currentRaceNo
            ? "RUNNING"
            : "OPEN",
        raceCount: meeting.raceCount || raceNos.length,
        currentRaceNo: meeting.currentRaceNo,
      });
      summary.racesUpserted += 1;
      if (raceCard.oddsAvailable) {
        summary.oddsRefreshed += 1;
      }
    }
  }
}

async function finalizeOfficialResults(summary: HkjcSyncSummary) {
  const candidates = await prisma.hkjcRaceSnapshot.findMany({
    where: {
      status: { in: ["OPEN", "RUNNING", "SCHEDULED", "FALLBACK"] },
    },
    select: {
      raceDate: true,
      racecourseCode: true,
      raceNo: true,
      startTime: true,
    },
    orderBy: [{ raceDate: "asc" }, { racecourseCode: "asc" }, { raceNo: "asc" }],
    take: 200,
  });

  for (const race of candidates) {
    if (!canFinalizeHkjcRace(race.raceDate, race.startTime)) {
      continue;
    }

    const storedResult = await readStoredHkjcRaceResult({
      raceDate: race.raceDate,
      racecourseCode: race.racecourseCode,
      raceNo: race.raceNo,
    });
    if (storedResult) {
      continue;
    }

    const officialResult = await getHkjcRaceResult({
      raceDate: race.raceDate,
      racecourseCode: race.racecourseCode,
      raceNo: race.raceNo,
    }).catch(() => null);

    if (!officialResult) {
      continue;
    }

    await storeHkjcRaceResult(
      {
        raceDate: race.raceDate,
        racecourseCode: race.racecourseCode,
        raceNo: race.raceNo,
      },
      officialResult,
    );
    summary.resultsFinalized += 1;
  }
}

export async function runHkjcSync(): Promise<HkjcSyncSummary> {
  const startedAt = new Date();
  const syncRun = await prisma.hkjcSyncRun.create({
    data: {
      status: "STARTED",
      startedAt,
    },
    select: { id: true },
  });

  const summary: HkjcSyncSummary = {
    status: "SUCCESS",
    meetingsScanned: 0,
    racesUpserted: 0,
    oddsRefreshed: 0,
    resultsFinalized: 0,
    betsSettled: 0,
  };

  const locked = await tryAcquireSyncLock();
  if (!locked) {
    summary.status = "SKIPPED";
    summary.failureMessage = "HKJC sync lock not acquired.";
    await prisma.hkjcSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "SKIPPED",
        finishedAt: new Date(),
        failureMessage: summary.failureMessage,
      },
    });
    return summary;
  }

  try {
    const activeMeetingsResponse = await fetchActiveMainMeetings().catch(() => null);
    const activeMeetings = activeMeetingsResponse ? extractActiveMainHkjcMeetings(activeMeetingsResponse) : [];
    summary.meetingsScanned = activeMeetings.length;

    if (activeMeetings.length > 0) {
      await syncActiveMeetings(summary, activeMeetings);
    }

    await finalizeOfficialResults(summary);
    const settlement = await settlePendingHkjcBets();
    summary.betsSettled = settlement.settled;

    await prisma.hkjcSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        meetingsScanned: summary.meetingsScanned,
        racesUpserted: summary.racesUpserted,
        oddsRefreshed: summary.oddsRefreshed,
        resultsFinalized: summary.resultsFinalized,
        betsSettled: summary.betsSettled,
      },
    });

    return summary;
  } catch (error) {
    summary.status = "FAILED";
    summary.failureMessage = error instanceof Error ? error.message : "HKJC sync failed.";
    await prisma.hkjcSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        meetingsScanned: summary.meetingsScanned,
        racesUpserted: summary.racesUpserted,
        oddsRefreshed: summary.oddsRefreshed,
        resultsFinalized: summary.resultsFinalized,
        betsSettled: summary.betsSettled,
        failureMessage: summary.failureMessage,
      },
    });
    throw error;
  } finally {
    await releaseSyncLock().catch(() => undefined);
  }
}
