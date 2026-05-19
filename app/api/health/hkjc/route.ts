import { NextResponse } from "next/server";
import { getRaceCardQualityIssues, isFallbackRaceCard, type HkjcRaceCard } from "@/lib/hkjc-racecard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function isAuthorizedHkjcHealth(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get("x-cron-secret") === secret;
}

function buildRaceCardForQuality(snapshot: {
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
  runnersJson: unknown;
}): HkjcRaceCard {
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
    quinellaOdds: [],
    quinellaOddsAvailable: false,
    quinellaOddsLastUpdateTime: snapshot.oddsLastUpdateTime,
    quinellaOddsInferred: false,
    raceOptions: [],
    runners: Array.isArray(snapshot.runnersJson)
      ? (snapshot.runnersJson as HkjcRaceCard["runners"])
      : [],
  };
}

export async function GET(request: Request) {
  if (!isAuthorizedHkjcHealth(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const [latestSync, latestSuccessfulSync, latestMeeting, realSnapshotCount, fallbackSnapshotCount] =
    await Promise.all([
      prisma.hkjcSyncRun.findFirst({
        orderBy: { startedAt: "desc" },
        select: {
          status: true,
          startedAt: true,
          finishedAt: true,
          meetingsScanned: true,
          racesUpserted: true,
          oddsRefreshed: true,
          resultsFinalized: true,
          betsSettled: true,
          failureMessage: true,
        },
      }),
      prisma.hkjcSyncRun.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { finishedAt: "desc" },
        select: { finishedAt: true },
      }),
      prisma.hkjcMeetingSnapshot.findFirst({
        where: { racecourseCode: { in: ["ST", "HV"] } },
        orderBy: { lastSyncedAt: "desc" },
        select: {
          raceDate: true,
          racecourseCode: true,
          racecourseName: true,
          status: true,
          raceCount: true,
          currentRaceNo: true,
          lastSyncedAt: true,
        },
      }),
      prisma.hkjcRaceSnapshot.count({
        where: {
          racecourseCode: { in: ["ST", "HV"] },
          NOT: { sourceUrl: { startsWith: "local://main-hkjc-racecard" } },
        },
      }),
      prisma.hkjcRaceSnapshot.count({
        where: {
          racecourseCode: { in: ["ST", "HV"] },
          sourceUrl: { startsWith: "local://main-hkjc-racecard" },
        },
      }),
    ]);

  const latestMeetingRaces = latestMeeting
    ? await prisma.hkjcRaceSnapshot.findMany({
        where: {
          raceDate: latestMeeting.raceDate,
          racecourseCode: latestMeeting.racecourseCode,
        },
        orderBy: { raceNo: "asc" },
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
          status: true,
          oddsAvailable: true,
          oddsLastUpdateTime: true,
          runnersJson: true,
          lastSyncedAt: true,
        },
      })
    : [];

  const raceQuality = latestMeetingRaces.map((race) => {
    const raceCard = buildRaceCardForQuality(race);
    return {
      raceNo: race.raceNo,
      status: race.status,
      lastSyncedAt: race.lastSyncedAt,
      runnerCount: raceCard.runners.length,
      fallback: isFallbackRaceCard(raceCard),
      issues: getRaceCardQualityIssues(raceCard),
    };
  });

  const qualityWarnings = raceQuality.flatMap((race) =>
    race.issues.map((issue) => ({ raceNo: race.raceNo, issue })),
  );

  return NextResponse.json({
    ok: qualityWarnings.length === 0,
    latestSync,
    lastSuccessfulSyncAt: latestSuccessfulSync?.finishedAt ?? null,
    snapshotSummary: {
      latestMeeting,
      realSnapshotCount,
      fallbackSnapshotCount,
    },
    raceQuality,
    qualityWarnings,
  });
}
