import assert from "node:assert/strict";
import test from "node:test";
import type { HkjcRunner } from "@/lib/hkjc-racecard";
import {
  calculatePotentialPayout,
  calculatePotentialPayoutForRunner,
  calculateWinPlaceComboPayout,
  canSubmitStake,
  findSelectedRunner,
  getBasketTotals,
  getBetLineCount,
  getBetLineTypes,
  getComboPendingDecision,
  getMobileBetModeTransition,
  getPlaceDividendCount,
  getQuickStakeValue,
  getRunnerLockedPlaceOdds,
  getRunnerLockedWinOdds,
  getSingleBetTapDecision,
  isPlaceWinningPosition,
  parseStakeInput,
  validateLockedOddsQuote,
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
  assert.equal(parseStakeInput("100"), 100);
  assert.equal(parseStakeInput("99"), null);
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
  assert.equal(canSubmitStake("50000", 100_000, "WIN_PLACE"), true);
  assert.equal(canSubmitStake("50001", 100_000, "WIN_PLACE"), false);
});

test("win/place bet type expands to the correct bet lines", () => {
  assert.deepEqual(getBetLineTypes("WIN"), ["WIN"]);
  assert.deepEqual(getBetLineTypes("PLACE"), ["PLACE"]);
  assert.deepEqual(getBetLineTypes("WIN_PLACE"), ["WIN", "PLACE"]);
  assert.equal(getBetLineCount("WIN"), 1);
  assert.equal(getBetLineCount("PLACE"), 1);
  assert.equal(getBetLineCount("WIN_PLACE"), 2);
});

test("basket totals count expanded lines and invalid stakes", () => {
  assert.deepEqual(
    getBasketTotals([
      { betType: "WIN", unitBetAmount: "100" },
      { betType: "PLACE", unitBetAmount: "200" },
      { betType: "WIN_PLACE", unitBetAmount: "300" },
    ]),
    {
      itemCount: 3,
      lineCount: 4,
      totalStake: 900,
      invalidStakeCount: 0,
    },
  );
  assert.deepEqual(getBasketTotals([{ betType: "WIN", unitBetAmount: "" }]), {
    itemCount: 1,
    lineCount: 1,
    totalStake: 0,
    invalidStakeCount: 1,
  });
  assert.deepEqual(getBasketTotals([{ betType: "WIN", unitBetAmount: 99 }]), {
    itemCount: 1,
    lineCount: 1,
    totalStake: 0,
    invalidStakeCount: 1,
  });
});

test("single-bet tap decision clears pending, ignores slip items, and sets new pending items", () => {
  assert.equal(getSingleBetTapDecision("1:WIN:", [], "1:WIN:"), "clear-pending");
  assert.equal(getSingleBetTapDecision(null, ["1:WIN:"], "1:WIN:"), "ignore-basket-item");
  assert.equal(getSingleBetTapDecision(null, [], "1:WIN:"), "set-pending");
  assert.equal(getSingleBetTapDecision("1:WIN:", [], "2:PLACE:"), "set-pending");
});

test("combo pending decision clears stale combo sheets and keeps non-combo pending items", () => {
  assert.equal(getComboPendingDecision("WIN_PLACE_COMBO", null, null), "clear-pending");
  assert.equal(getComboPendingDecision("WIN_PLACE_COMBO", "1", null), "clear-pending");
  assert.equal(getComboPendingDecision("WIN_PLACE_COMBO", "1", "2"), "set-pending");
  assert.equal(getComboPendingDecision("WIN", "1", null), "keep-pending");
});

test("mobile bet mode transition clears combo draft and pending state only when required", () => {
  assert.deepEqual(getMobileBetModeTransition("win-place", "combo-wp"), {
    clearComboDraft: false,
    clearPendingBet: "all",
  });
  assert.deepEqual(getMobileBetModeTransition("combo-wp", "win-place"), {
    clearComboDraft: true,
    clearPendingBet: "combo-only",
  });
  assert.deepEqual(getMobileBetModeTransition("win-place", "quinella"), {
    clearComboDraft: true,
    clearPendingBet: "all",
  });
  assert.deepEqual(getMobileBetModeTransition("win-place", "win-place"), {
    clearComboDraft: false,
    clearPendingBet: "none",
  });
});

test("potential payout uses app multiplier and floors whole coins", () => {
  assert.equal(calculatePotentialPayout("10000", 2), 20000);
  assert.equal(calculatePotentialPayout("10000", 2.5), 25000);
  assert.equal(calculatePotentialPayout("101", 1.5), 151);
  assert.equal(calculatePotentialPayout("", 2), 0);
});

test("potential payout can use locked HKJC win odds", () => {
  const oddsRunner = {
    ...runner("7", "ODDS HORSE"),
    winOdds: "4.8",
    oddsAvailable: true,
    placeOdds: "1.8",
    placeOddsAvailable: true,
  };

  assert.equal(getRunnerLockedWinOdds(oddsRunner), 4.8);
  assert.equal(getRunnerLockedPlaceOdds(oddsRunner), 1.8);
  assert.equal(calculatePotentialPayoutForRunner("100", oddsRunner), 480);
  assert.equal(calculatePotentialPayoutForRunner("100", oddsRunner, "PLACE"), 180);
  assert.equal(calculatePotentialPayoutForRunner("100", oddsRunner, "WIN_PLACE"), 660);
  assert.equal(calculatePotentialPayoutForRunner("100", { ...oddsRunner, oddsAvailable: false }), 0);
  assert.equal(
    calculateWinPlaceComboPayout(
      "100",
      oddsRunner,
      { ...runner("8", "PLACE HORSE"), placeOdds: "2.2", placeOddsAvailable: true },
    ),
    1056,
  );
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
  assert.deepEqual(
    validateLockedOddsQuote({ quotedOdds: "1.8", currentOdds: "1.80", oddsAvailable: true }),
    { ok: true, lockedWinOdds: 1.8 },
  );
});

test("place dividend qualification follows local HKJC runner-count rules", () => {
  assert.equal(getPlaceDividendCount(3), 0);
  assert.equal(getPlaceDividendCount(4), 2);
  assert.equal(getPlaceDividendCount(7), 2);
  assert.equal(getPlaceDividendCount(8), 3);
  assert.equal(isPlaceWinningPosition("2", 4), true);
  assert.equal(isPlaceWinningPosition("3", 4), false);
  assert.equal(isPlaceWinningPosition("3", 8), true);
  assert.equal(isPlaceWinningPosition("4", 8), false);
});

test("selected runner lookup falls back to first runner", () => {
  const runners = [runner("1", "FIRST"), runner("2", "SECOND")];

  assert.equal(findSelectedRunner(runners, "2")?.name, "SECOND");
  assert.equal(findSelectedRunner(runners, "9")?.name, "FIRST");
  assert.equal(findSelectedRunner([], "1"), null);
});
