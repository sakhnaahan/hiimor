import assert from "node:assert/strict";
import test from "node:test";
import type { HkjcRunner } from "@/lib/hkjc-racecard";
import {
  calculatePotentialPayout,
  calculatePotentialPayoutForRunner,
  canSubmitStake,
  findSelectedRunner,
  getQuickStakeValue,
  getRunnerLockedWinOdds,
  parseStakeInput,
  validateLockedWinOddsQuote,
} from "@/lib/race-betting-ui";

function runner(horseNo: string, name: string): HkjcRunner {
  return {
    horseNo,
    last6Runs: "",
    name,
    brandNo: "",
    weight: "",
    jockey: "",
    overWeight: "",
    draw: "",
    trainer: "",
    rating: "",
    horseWeight: "",
    bestTime: "",
    age: "",
    sex: "",
    daysSinceLastRun: "",
    gear: "",
  };
}

test("stake input accepts positive integer coins only", () => {
  assert.equal(parseStakeInput("10000"), 10000);
  assert.equal(parseStakeInput("0"), null);
  assert.equal(parseStakeInput("-10"), null);
  assert.equal(parseStakeInput("10.5"), null);
  assert.equal(parseStakeInput("bad"), null);
});

test("quick stake values support max and clear", () => {
  assert.equal(getQuickStakeValue("max", 123_456), "123456");
  assert.equal(getQuickStakeValue("clear", 123_456), "");
});

test("submit stake requires positive amount within balance", () => {
  assert.equal(canSubmitStake("50000", 100_000), true);
  assert.equal(canSubmitStake("100001", 100_000), false);
  assert.equal(canSubmitStake("", 100_000), false);
});

test("potential payout uses app multiplier and floors whole coins", () => {
  assert.equal(calculatePotentialPayout("10000", 2), 20000);
  assert.equal(calculatePotentialPayout("10000", 2.5), 25000);
  assert.equal(calculatePotentialPayout("3", 1.5), 4);
  assert.equal(calculatePotentialPayout("", 2), 0);
});

test("potential payout can use locked HKJC win odds", () => {
  const oddsRunner = {
    ...runner("7", "ODDS HORSE"),
    winOdds: "4.8",
    oddsAvailable: true,
  };

  assert.equal(getRunnerLockedWinOdds(oddsRunner), 4.8);
  assert.equal(calculatePotentialPayoutForRunner("100", oddsRunner), 480);
  assert.equal(calculatePotentialPayoutForRunner("100", { ...oddsRunner, oddsAvailable: false }), 0);
});

test("locked odds validation rejects changed or unavailable odds", () => {
  assert.deepEqual(
    validateLockedWinOddsQuote({ quotedWinOdds: "4.8", currentWinOdds: "4.80", oddsAvailable: true }),
    { ok: true, lockedWinOdds: 4.8 },
  );
  assert.deepEqual(
    validateLockedWinOddsQuote({ quotedWinOdds: "4.8", currentWinOdds: "5.0", oddsAvailable: true }),
    { ok: false, reason: "changed" },
  );
  assert.deepEqual(
    validateLockedWinOddsQuote({ quotedWinOdds: "4.8", currentWinOdds: undefined, oddsAvailable: true }),
    { ok: false, reason: "unavailable" },
  );
  assert.deepEqual(
    validateLockedWinOddsQuote({ quotedWinOdds: "4.8", currentWinOdds: "4.8", oddsAvailable: false }),
    { ok: false, reason: "unavailable" },
  );
});

test("selected runner lookup falls back to first runner", () => {
  const runners = [runner("1", "FIRST"), runner("2", "SECOND")];

  assert.equal(findSelectedRunner(runners, "2")?.name, "SECOND");
  assert.equal(findSelectedRunner(runners, "9")?.name, "FIRST");
  assert.equal(findSelectedRunner([], "1"), null);
});
