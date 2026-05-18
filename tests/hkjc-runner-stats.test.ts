import assert from "node:assert/strict";
import test from "node:test";
import type { HkjcRaceCard, HkjcRunner } from "@/lib/hkjc-racecard";
import type { Language } from "@/lib/i18n";
import { getRunnerStatSignals } from "@/lib/hkjc-runner-stats";

function runner(overrides: Partial<HkjcRunner>): HkjcRunner {
  return {
    horseNo: "1",
    last6Runs: "",
    name: "TEST RUNNER",
    brandNo: "T001",
    weight: "126",
    jockey: "J Test",
    overWeight: "",
    draw: "1",
    trainer: "T Test",
    rating: "",
    horseWeight: "",
    bestTime: "",
    age: "",
    sex: "",
    daysSinceLastRun: "",
    gear: "",
    ...overrides,
  };
}

function raceCard(runners: HkjcRunner[], overrides: Partial<HkjcRaceCard> = {}): HkjcRaceCard {
  return {
    sourceUrl: "https://example.test/racecard",
    raceDate: "2026/05/09",
    racecourseCode: "ST",
    raceNo: 1,
    raceName: "TEST RACE",
    meetingDate: "Saturday, May 09, 2026",
    racecourse: "Sha Tin",
    startTime: "12:30",
    surface: "Turf",
    course: '"C" Course',
    distance: "1000M",
    going: "Good",
    prizeMoney: "$950,000",
    raceClass: "Class 4",
    oddsAvailable: false,
    oddsLastUpdateTime: "",
    quinellaOdds: [],
    quinellaOddsAvailable: false,
    quinellaOddsLastUpdateTime: "",
    quinellaOddsInferred: false,
    raceOptions: [],
    runners,
    ...overrides,
  };
}

function signalLabels(
  card: HkjcRaceCard,
  selectedRunner: HkjcRunner,
  language: Language = "en",
) {
  return getRunnerStatSignals(card, selectedRunner, language).map(
    (signal) => signal.label,
  );
}

test("short race marks inside draw", () => {
  const selectedRunner = runner({ draw: "2" });
  const card = raceCard([selectedRunner, runner({ horseNo: "2", draw: "9" })]);

  assert.ok(signalLabels(card, selectedRunner).includes("Inside draw"));
});

test("short race marks wide draw near the outside gate", () => {
  const selectedRunner = runner({ draw: "10" });
  const card = raceCard([runner({ horseNo: "2", draw: "1" }), selectedRunner]);

  assert.ok(signalLabels(card, selectedRunner).includes("Wide draw"));
});

test("first-time gear is detected", () => {
  const selectedRunner = runner({ gear: "TT1" });
  const card = raceCard([selectedRunner]);

  assert.ok(signalLabels(card, selectedRunner).includes("First-time gear"));
});

test("missing last six runs is limited form", () => {
  const selectedRunner = runner({ last6Runs: "" });
  const card = raceCard([selectedRunner]);

  assert.ok(signalLabels(card, selectedRunner).includes("Limited form"));
});

test("recent placing marks good recent form", () => {
  const selectedRunner = runner({ last6Runs: "5/3/8/10" });
  const card = raceCard([selectedRunner]);

  assert.ok(signalLabels(card, selectedRunner).includes("Good recent form"));
});

test("light and top carried weights are detected within a race", () => {
  const lightRunner = runner({ horseNo: "1", weight: "121" });
  const topRunner = runner({ horseNo: "2", weight: "133", draw: "5" });
  const card = raceCard([lightRunner, topRunner]);

  assert.ok(signalLabels(card, lightRunner).includes("Light weight"));
  assert.ok(signalLabels(card, topRunner).includes("Top weight"));
});

test("mongolian labels are returned for runner signals", () => {
  const selectedRunner = runner({ draw: "2", weight: "133", last6Runs: "5/3/8/10" });
  const otherRunner = runner({ horseNo: "2", draw: "9", weight: "121" });
  const card = raceCard([selectedRunner, otherRunner]);

  const labels = signalLabels(card, selectedRunner, "mn");

  assert.ok(labels.includes("Дотор сугалаа"));
  assert.ok(labels.includes("Их жин"));
  assert.ok(labels.includes("Сүүлийн форм сайн"));
});
