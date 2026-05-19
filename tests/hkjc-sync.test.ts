import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalMainRaceCard, hydrateRaceCardOdds } from "@/lib/hkjc-racecard";
import {
  canFinalizeHkjcRace,
  extractActiveMainHkjcMeetings,
  isSyncableRaceCardForMeeting,
} from "@/lib/hkjc-sync";

test("active GraphQL ST/HV meetings expand into syncable race numbers only", () => {
  const meetings = extractActiveMainHkjcMeetings({
    data: {
      raceMeetings: [
        {
          venueCode: "S1",
          date: "2026-05-20",
          currentNumberOfRace: 3,
          totalNumberOfRace: 10,
          races: [{ no: 3, status: "DECLARED", runners: [{ no: "1" }] }],
        },
        {
          venueCode: "ST",
          date: "2026-05-20",
          currentNumberOfRace: 4,
          totalNumberOfRace: 10,
          races: [
            { no: 1, status: "RESULT", runners: [{ no: "1" }] },
            { no: 4, status: "DECLARED", runners: [{ no: "2" }] },
            { no: 5, status: "OPEN", runners: [{ no: "7" }] },
          ],
        },
        {
          venueCode: "HV",
          date: "2026-05-21",
          currentNumberOfRace: 2,
          totalNumberOfRace: 8,
          races: [
            { no: 1, status: "CLOSED", runners: [{ no: "1" }] },
            { no: 2, status: "RUNNING", runners: [{ no: "5" }] },
          ],
        },
      ],
    },
  });

  assert.deepEqual(meetings, [
    {
      raceDate: "2026-05-20",
      racecourseCode: "ST",
      currentRaceNo: 4,
      raceCount: 10,
      activeRaceNos: [4, 5],
    },
    {
      raceDate: "2026-05-21",
      racecourseCode: "HV",
      currentRaceNo: 2,
      raceCount: 8,
      activeRaceNos: [2],
    },
  ]);
});

test("result finalization only starts after the HK race start time", () => {
  assert.equal(canFinalizeHkjcRace("2026/05/20", "19:10", new Date("2026-05-20T19:09:59+08:00").getTime()), false);
  assert.equal(canFinalizeHkjcRace("2026/05/20", "19:10", new Date("2026-05-20T19:10:00+08:00").getTime()), true);
});

test("fallback racecard builder can preload all races for the next ST/HV meeting shell", () => {
  const raceCard = buildLocalMainRaceCard(
    {
      raceDate: "2026-05-24",
      racecourseCode: "ST",
      raceCount: 3,
    },
    { raceNo: 2 },
  );

  assert.equal(raceCard.racecourseCode, "ST");
  assert.equal(raceCard.raceNo, 2);
  assert.deepEqual(raceCard.quinellaOdds, []);
  assert.equal(raceCard.quinellaOddsAvailable, false);
  assert.equal(raceCard.quinellaOddsInferred, false);
  assert.deepEqual(raceCard.raceOptions, [
    { raceNo: 1, raceDate: "2026/05/24", racecourseCode: "ST" },
    { raceNo: 2, raceDate: "2026/05/24", racecourseCode: "ST" },
    { raceNo: 3, raceDate: "2026/05/24", racecourseCode: "ST" },
  ]);
});

test("cron sync rejects fallback cards and race number mismatches", () => {
  const meeting = {
    raceDate: "2026-05-24",
    racecourseCode: "ST",
    currentRaceNo: 2,
    raceCount: 3,
    activeRaceNos: [1, 2, 3],
  };
  const fallbackRaceCard = buildLocalMainRaceCard(meeting, { raceNo: 2 });
  const realRaceCard = {
    ...fallbackRaceCard,
    sourceUrl:
      "https://racing.hkjc.com/en-us/local/information/racecard?racedate=2026/05/24&Racecourse=ST&RaceNo=2",
    runners: fallbackRaceCard.runners.map((runner) => ({
      ...runner,
      name: `REAL HORSE ${runner.horseNo}`,
      brandNo: `L${String(200 + Number(runner.horseNo))}`,
    })),
  };

  assert.equal(isSyncableRaceCardForMeeting(fallbackRaceCard, meeting, 2), false);
  assert.equal(isSyncableRaceCardForMeeting(realRaceCard, meeting, 2), true);
  assert.equal(isSyncableRaceCardForMeeting(realRaceCard, meeting, 3), false);
});

test("stored racecard shells hydrate live official Quinella odds", async () => {
  const raceCard = buildLocalMainRaceCard(
    {
      raceDate: "2026-05-24",
      racecourseCode: "ST",
      raceCount: 1,
    },
    { raceNo: 1 },
  );
  raceCard.quinellaOdds = [];
  raceCard.quinellaOddsAvailable = false;

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { variables?: { oddsTypes?: string[] } };
    const oddsTypes = body.variables?.oddsTypes ?? [];

    return Response.json({
      data: {
        raceMeetings: [
          {
            pmPools: oddsTypes.includes("QIN")
              ? [
                  {
                    oddsType: "QIN",
                    status: "START_SELL",
                    sellStatus: "START_SELL",
                    lastUpdateTime: "10:02",
                    oddsNodes: [{ combString: "06,08", oddsValue: "14", hotFavourite: true }],
                  },
                ]
              : [
                  {
                    oddsType: "WIN",
                    status: "START_SELL",
                    sellStatus: "START_SELL",
                    lastUpdateTime: "10:01",
                    oddsNodes: [{ combString: "06", oddsValue: "4.8", hotFavourite: false }],
                  },
                  {
                    oddsType: "PLA",
                    status: "START_SELL",
                    sellStatus: "START_SELL",
                    lastUpdateTime: "10:01",
                    oddsNodes: [{ combString: "06", oddsValue: "1.7", hotFavourite: false }],
                  },
                ],
          },
        ],
      },
    });
  }) as typeof fetch;

  try {
    const hydratedRaceCard = await hydrateRaceCardOdds(raceCard);

    assert.equal(hydratedRaceCard.quinellaOddsAvailable, true);
    assert.equal(hydratedRaceCard.quinellaOddsLastUpdateTime, "10:02");
    assert.deepEqual(hydratedRaceCard.quinellaOdds[0], {
      horseNoA: "6",
      horseNoB: "8",
      odds: "14",
      poolStatus: "START_SELL",
      sellStatus: "START_SELL",
      lastUpdateTime: "10:02",
      inferred: false,
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("stored racecard shells stay Quinella unavailable without official QIN odds", async () => {
  const raceCard = buildLocalMainRaceCard(
    {
      raceDate: "2026-05-24",
      racecourseCode: "ST",
      raceCount: 1,
    },
    { raceNo: 1 },
  );

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { variables?: { oddsTypes?: string[] } };
    const oddsTypes = body.variables?.oddsTypes ?? [];

    return Response.json({
      data: {
        raceMeetings: [
          {
            pmPools: oddsTypes.includes("QIN")
              ? []
              : [
                  {
                    oddsType: "WIN",
                    status: "START_SELL",
                    sellStatus: "START_SELL",
                    lastUpdateTime: "10:01",
                    oddsNodes: [{ combString: "06", oddsValue: "4.8", hotFavourite: false }],
                  },
                ],
          },
        ],
      },
    });
  }) as typeof fetch;

  try {
    const hydratedRaceCard = await hydrateRaceCardOdds(raceCard);

    assert.deepEqual(hydratedRaceCard.quinellaOdds, []);
    assert.equal(hydratedRaceCard.quinellaOddsAvailable, false);
    assert.equal(hydratedRaceCard.quinellaOddsLastUpdateTime, "");
  } finally {
    globalThis.fetch = previousFetch;
  }
});
