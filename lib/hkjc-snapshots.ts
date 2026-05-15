import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { HkjcRaceCard } from "@/lib/hkjc-racecard";
import type { HkjcRaceResult } from "@/lib/hkjc-results";

export const HKJC_ACTIVE_SNAPSHOT_STATUSES = ["OPEN", "RUNNING", "SCHEDULED", "FALLBACK"] as const;
export const HKJC_FINAL_SNAPSHOT_STATUSES = ["RESULT", "CLOSED"] as const;
export const HKJC_SNAPSHOT_FRESH_MS = 10 * 60 * 1000;

type SnapshotRaceRequest = {
  raceDate?: string;
  racecourse?: string;
  raceNo?: number;
};

type SnapshotReadResult = {
  raceCard: HkjcRaceCard;
  lastSyncedAt: Date;
  isFresh: boolean;
};

type UpsertRaceCardSnapshotOptions = {
  meetingStatus: string;
  raceStatus: string;
  result?: HkjcRaceResult | null;
  raceCount?: number;
  currentRaceNo?: number | null;
  lastSyncedAt?: Date;
};

type SnapshotPrismaClient = typeof prisma & {
  hkjcMeetingSnapshot?: typeof prisma.hkjcMeetingSnapshot;
  hkjcRaceSnapshot?: typeof prisma.hkjcRaceSnapshot;
};

function normalizeRaceDate(value: string) {
  return value.replace(/-/g, "/");
}

function normalizeRacecourseCode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeSnapshotRequest(request: SnapshotRaceRequest = {}) {
  return {
    raceDate: request.raceDate ? normalizeRaceDate(request.raceDate) : undefined,
    racecourse: request.racecourse ? normalizeRacecourseCode(request.racecourse) : undefined,
    raceNo: request.raceNo,
  };
}

function getSnapshotPrisma(): SnapshotPrismaClient | null {
  const snapshotPrisma = prisma as SnapshotPrismaClient;

  if (!snapshotPrisma.hkjcMeetingSnapshot || !snapshotPrisma.hkjcRaceSnapshot) {
    return null;
  }

  return snapshotPrisma;
}

function buildStoredRaceCard(snapshot: {
  sourceUrl: string;
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
  raceName: string;
  meetingDate: string;
  racecourseName: string;
  startTime: string;
  surface: string;
  course: string;
  distance: string;
  going: string;
  prizeMoney: string;
  raceClass: string;
  oddsAvailable: boolean;
  oddsLastUpdateTime: string;
  runnersJson: Prisma.JsonValue;
}) {
  if (!Array.isArray(snapshot.runnersJson)) {
    return null;
  }

  return {
    sourceUrl: snapshot.sourceUrl,
    raceDate: snapshot.raceDate,
    racecourseCode: snapshot.racecourseCode,
    raceNo: snapshot.raceNo,
    raceName: snapshot.raceName,
    meetingDate: snapshot.meetingDate,
    racecourse: snapshot.racecourseName,
    startTime: snapshot.startTime,
    surface: snapshot.surface,
    course: snapshot.course,
    distance: snapshot.distance,
    going: snapshot.going,
    prizeMoney: snapshot.prizeMoney,
    raceClass: snapshot.raceClass,
    oddsAvailable: snapshot.oddsAvailable,
    oddsLastUpdateTime: snapshot.oddsLastUpdateTime,
    raceOptions: [],
    runners: snapshot.runnersJson as HkjcRaceCard["runners"],
  } satisfies HkjcRaceCard;
}

async function populateRaceOptions(raceCard: HkjcRaceCard) {
  const snapshotPrisma = getSnapshotPrisma();
  if (!snapshotPrisma?.hkjcRaceSnapshot) {
    raceCard.raceOptions = [
      { raceNo: raceCard.raceNo, raceDate: raceCard.raceDate, racecourseCode: raceCard.racecourseCode },
    ];
    return raceCard;
  }

  const raceOptions = await snapshotPrisma.hkjcRaceSnapshot.findMany({
    where: {
      raceDate: raceCard.raceDate,
      racecourseCode: raceCard.racecourseCode,
      status: { in: [...HKJC_ACTIVE_SNAPSHOT_STATUSES, ...HKJC_FINAL_SNAPSHOT_STATUSES] },
    },
    orderBy: { raceNo: "asc" },
    select: {
      raceNo: true,
      raceDate: true,
      racecourseCode: true,
    },
  });

  raceCard.raceOptions =
    raceOptions.length > 0
      ? raceOptions.map((option) => ({
          raceNo: option.raceNo,
          raceDate: option.raceDate,
          racecourseCode: option.racecourseCode,
        }))
      : [{ raceNo: raceCard.raceNo, raceDate: raceCard.raceDate, racecourseCode: raceCard.racecourseCode }];

  return raceCard;
}

export async function readStoredHkjcRaceCard(
  request: SnapshotRaceRequest = {},
  options: { maxAgeMs?: number } = {},
): Promise<SnapshotReadResult | null> {
  const normalizedRequest = normalizeSnapshotRequest(request);
  const maxAgeMs = options.maxAgeMs ?? HKJC_SNAPSHOT_FRESH_MS;
  const snapshotPrisma = getSnapshotPrisma();

  if (!snapshotPrisma?.hkjcRaceSnapshot) {
    return null;
  }

  const snapshot =
    normalizedRequest.raceDate && normalizedRequest.racecourse && normalizedRequest.raceNo
      ? await snapshotPrisma.hkjcRaceSnapshot.findUnique({
          where: {
            raceDate_racecourseCode_raceNo: {
              raceDate: normalizedRequest.raceDate,
              racecourseCode: normalizedRequest.racecourse,
              raceNo: normalizedRequest.raceNo,
            },
          },
          select: {
            sourceUrl: true,
            raceDate: true,
            racecourseCode: true,
            raceNo: true,
            raceName: true,
            meetingDate: true,
            racecourseName: true,
            startTime: true,
            surface: true,
            course: true,
            distance: true,
            going: true,
            prizeMoney: true,
            raceClass: true,
            oddsAvailable: true,
            oddsLastUpdateTime: true,
            runnersJson: true,
            lastSyncedAt: true,
          },
        })
      : await snapshotPrisma.hkjcRaceSnapshot.findFirst({
          where: {
            ...(normalizedRequest.raceDate ? { raceDate: normalizedRequest.raceDate } : {}),
            ...(normalizedRequest.racecourse ? { racecourseCode: normalizedRequest.racecourse } : {}),
            status: { in: [...HKJC_ACTIVE_SNAPSHOT_STATUSES, ...HKJC_FINAL_SNAPSHOT_STATUSES] },
          },
          orderBy: [{ raceDate: "asc" }, { racecourseCode: "asc" }, { raceNo: "asc" }],
          select: {
            sourceUrl: true,
            raceDate: true,
            racecourseCode: true,
            raceNo: true,
            raceName: true,
            meetingDate: true,
            racecourseName: true,
            startTime: true,
            surface: true,
            course: true,
            distance: true,
            going: true,
            prizeMoney: true,
            raceClass: true,
            oddsAvailable: true,
            oddsLastUpdateTime: true,
            runnersJson: true,
            lastSyncedAt: true,
          },
        });

  if (!snapshot) {
    return null;
  }

  const raceCard = buildStoredRaceCard(snapshot);
  if (!raceCard) {
    return null;
  }

  await populateRaceOptions(raceCard);

  return {
    raceCard,
    lastSyncedAt: snapshot.lastSyncedAt,
    isFresh: Date.now() - snapshot.lastSyncedAt.getTime() <= maxAgeMs,
  };
}

export async function upsertHkjcRaceCardSnapshot(
  raceCard: HkjcRaceCard,
  options: UpsertRaceCardSnapshotOptions,
) {
  const snapshotPrisma = getSnapshotPrisma();
  if (!snapshotPrisma?.hkjcMeetingSnapshot || !snapshotPrisma.hkjcRaceSnapshot) {
    return;
  }

  const raceDate = normalizeRaceDate(raceCard.raceDate);
  const racecourseCode = normalizeRacecourseCode(raceCard.racecourseCode);
  const lastSyncedAt = options.lastSyncedAt ?? new Date();
  const raceCount = Math.max(options.raceCount ?? 0, raceCard.raceOptions.length || raceCard.raceNo || 0);

  const meeting = await snapshotPrisma.hkjcMeetingSnapshot.upsert({
    where: {
      raceDate_racecourseCode: {
        raceDate,
        racecourseCode,
      },
    },
    update: {
      racecourseName: raceCard.racecourse,
      meetingDate: raceCard.meetingDate,
      status: options.meetingStatus,
      raceCount,
      currentRaceNo: options.currentRaceNo ?? null,
      lastSyncedAt,
    },
    create: {
      raceDate,
      racecourseCode,
      racecourseName: raceCard.racecourse,
      meetingDate: raceCard.meetingDate,
      status: options.meetingStatus,
      raceCount,
      currentRaceNo: options.currentRaceNo ?? null,
      lastSyncedAt,
    },
    select: { id: true },
  });

  await snapshotPrisma.hkjcRaceSnapshot.upsert({
    where: {
      raceDate_racecourseCode_raceNo: {
        raceDate,
        racecourseCode,
        raceNo: raceCard.raceNo,
      },
    },
    update: {
      meetingSnapshotId: meeting.id,
      sourceUrl: raceCard.sourceUrl,
      raceName: raceCard.raceName,
      meetingDate: raceCard.meetingDate,
      racecourseName: raceCard.racecourse,
      startTime: raceCard.startTime,
      surface: raceCard.surface,
      course: raceCard.course,
      distance: raceCard.distance,
      going: raceCard.going,
      prizeMoney: raceCard.prizeMoney,
      raceClass: raceCard.raceClass,
      status: options.raceStatus,
      oddsAvailable: raceCard.oddsAvailable,
      oddsLastUpdateTime: raceCard.oddsLastUpdateTime,
      runnersJson: raceCard.runners as Prisma.InputJsonValue,
      resultJson: options.result ? (options.result as Prisma.InputJsonValue) : Prisma.DbNull,
      lastSyncedAt,
    },
    create: {
      meetingSnapshotId: meeting.id,
      raceDate,
      racecourseCode,
      raceNo: raceCard.raceNo,
      sourceUrl: raceCard.sourceUrl,
      raceName: raceCard.raceName,
      meetingDate: raceCard.meetingDate,
      racecourseName: raceCard.racecourse,
      startTime: raceCard.startTime,
      surface: raceCard.surface,
      course: raceCard.course,
      distance: raceCard.distance,
      going: raceCard.going,
      prizeMoney: raceCard.prizeMoney,
      raceClass: raceCard.raceClass,
      status: options.raceStatus,
      oddsAvailable: raceCard.oddsAvailable,
      oddsLastUpdateTime: raceCard.oddsLastUpdateTime,
      runnersJson: raceCard.runners as Prisma.InputJsonValue,
      resultJson: options.result ? (options.result as Prisma.InputJsonValue) : undefined,
      lastSyncedAt,
    },
  });
}

export async function storeHkjcRaceResult(
  request: { raceDate: string; racecourseCode: string; raceNo: number },
  result: HkjcRaceResult,
  status = "RESULT",
) {
  const snapshotPrisma = getSnapshotPrisma();
  if (!snapshotPrisma?.hkjcRaceSnapshot) {
    return;
  }

  await snapshotPrisma.hkjcRaceSnapshot.updateMany({
    where: {
      raceDate: normalizeRaceDate(request.raceDate),
      racecourseCode: normalizeRacecourseCode(request.racecourseCode),
      raceNo: request.raceNo,
    },
    data: {
      resultJson: result as Prisma.InputJsonValue,
      status,
      lastSyncedAt: new Date(),
    },
  });
}

export async function readStoredHkjcRaceResult(request: {
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
}) {
  const snapshotPrisma = getSnapshotPrisma();
  if (!snapshotPrisma?.hkjcRaceSnapshot) {
    return null;
  }

  const snapshot = await snapshotPrisma.hkjcRaceSnapshot.findUnique({
    where: {
      raceDate_racecourseCode_raceNo: {
        raceDate: normalizeRaceDate(request.raceDate),
        racecourseCode: normalizeRacecourseCode(request.racecourseCode),
        raceNo: request.raceNo,
      },
    },
    select: { resultJson: true },
  });

  if (!snapshot?.resultJson || typeof snapshot.resultJson !== "object" || Array.isArray(snapshot.resultJson)) {
    return null;
  }

  const result = snapshot.resultJson as Prisma.JsonObject;
  if (!Array.isArray(result.runners) || typeof result.sourceUrl !== "string" || typeof result.winner !== "object") {
    return null;
  }

  return result as unknown as HkjcRaceResult;
}
