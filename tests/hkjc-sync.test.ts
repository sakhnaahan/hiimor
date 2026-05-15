import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalMainRaceCard } from "@/lib/hkjc-racecard";
import { canFinalizeHkjcRace, extractActiveMainHkjcMeetings } from "@/lib/hkjc-sync";

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
  assert.deepEqual(raceCard.raceOptions, [
    { raceNo: 1, raceDate: "2026/05/24", racecourseCode: "ST" },
    { raceNo: 2, raceDate: "2026/05/24", racecourseCode: "ST" },
    { raceNo: 3, raceDate: "2026/05/24", racecourseCode: "ST" },
  ]);
});
