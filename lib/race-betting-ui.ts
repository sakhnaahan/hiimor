import type { HkjcRunner } from "@/lib/hkjc-racecard";
import { parseOdds } from "@/lib/hkjc-odds";
import { MIN_BET_AMOUNT } from "@/lib/rules";

export type QuickStakeAction = "max" | "clear";
export type RaceBetType = "WIN" | "PLACE" | "WIN_PLACE" | "WIN_PLACE_COMBO";
export type RaceBetLineType = "WIN" | "PLACE";
export type SingleBetTapDecision = "clear-pending" | "ignore-basket-item" | "set-pending";
export type ComboPendingDecision = "clear-pending" | "keep-pending" | "set-pending";

export type RaceBasketTotalItem = {
  betType: RaceBetType;
  unitBetAmount: string | number;
};

export function parseStakeInput(value: string) {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const amount = Number.parseInt(value, 10);
  return Number.isSafeInteger(amount) && amount >= MIN_BET_AMOUNT ? amount : null;
}

export function getQuickStakeValue(action: QuickStakeAction, balance: number) {
  if (action === "clear") {
    return "";
  }

  if (action === "max") {
    return String(Math.max(0, balance));
  }

  return "";
}

export function getBetLineTypes(betType: RaceBetType): RaceBetLineType[] {
  if (betType === "WIN_PLACE_COMBO") {
    return ["WIN"];
  }

  return betType === "WIN_PLACE" ? ["WIN", "PLACE"] : [betType];
}

export function getBetLineCount(betType: RaceBetType) {
  return getBetLineTypes(betType).length;
}

export function getTotalStake(stakeInput: string, betType: RaceBetType) {
  const stake = parseStakeInput(stakeInput);
  return stake === null ? null : stake * getBetLineCount(betType);
}

export function canSubmitStake(stakeInput: string, balance: number, betType: RaceBetType = "WIN") {
  const totalStake = getTotalStake(stakeInput, betType);
  return totalStake !== null && totalStake <= balance;
}

export function getPlaceDividendCount(runnerCount: number) {
  if (runnerCount >= 8) {
    return 3;
  }

  if (runnerCount >= 4) {
    return 2;
  }

  return 0;
}

export function canOfferPlaceBet(runners: readonly HkjcRunner[]) {
  return getPlaceDividendCount(runners.length) > 0 && runners.some((runner) => runner.placeOddsAvailable);
}

export function isPlaceWinningPosition(place: string | null | undefined, runnerCount: number) {
  const parsedPlace = Number.parseInt(String(place ?? ""), 10);
  const dividendCount = getPlaceDividendCount(runnerCount);
  return dividendCount > 0 && Number.isFinite(parsedPlace) && parsedPlace >= 1 && parsedPlace <= dividendCount;
}

export function canSubmitStakeForBalance(stakeInput: string, balance: number) {
  const stake = parseStakeInput(stakeInput);
  return stake !== null && stake <= balance;
}

export function calculatePotentialPayout(stakeInput: string, payoutMultiplier: number) {
  const stake = parseStakeInput(stakeInput);
  return stake === null ? 0 : Math.floor(stake * payoutMultiplier);
}

export function getRunnerLockedWinOdds(runner: HkjcRunner | null | undefined) {
  if (!runner?.oddsAvailable) {
    return null;
  }

  return parseOdds(runner.winOdds);
}

export function getRunnerLockedPlaceOdds(runner: HkjcRunner | null | undefined) {
  if (!runner?.placeOddsAvailable) {
    return null;
  }

  return parseOdds(runner.placeOdds);
}

export function calculatePotentialPayoutForRunner(
  stakeInput: string,
  runner: HkjcRunner | null | undefined,
  betType: RaceBetType = "WIN",
) {
  if (betType === "WIN_PLACE_COMBO") {
    return 0;
  }

  return getBetLineTypes(betType).reduce((total, lineType) => {
    const lockedOdds = lineType === "WIN" ? getRunnerLockedWinOdds(runner) : getRunnerLockedPlaceOdds(runner);
    return total + (lockedOdds === null ? 0 : calculatePotentialPayout(stakeInput, lockedOdds));
  }, 0);
}

export function calculateWinPlaceComboPayout(
  stakeInput: string,
  winRunner: HkjcRunner | null | undefined,
  placeRunner: HkjcRunner | null | undefined,
) {
  const winOdds = getRunnerLockedWinOdds(winRunner);
  const placeOdds = getRunnerLockedPlaceOdds(placeRunner);
  return winOdds === null || placeOdds === null ? 0 : calculatePotentialPayout(stakeInput, winOdds * placeOdds);
}

export function getBasketTotals(items: readonly RaceBasketTotalItem[]) {
  return items.reduce(
    (totals, item) => {
      const unitStake =
        typeof item.unitBetAmount === "number"
          ? Number.isSafeInteger(item.unitBetAmount) && item.unitBetAmount >= MIN_BET_AMOUNT
            ? item.unitBetAmount
            : null
          : parseStakeInput(item.unitBetAmount);
      const lineCount = getBetLineCount(item.betType);

      return {
        itemCount: totals.itemCount + 1,
        lineCount: totals.lineCount + lineCount,
        totalStake: totals.totalStake + (unitStake === null ? 0 : unitStake * lineCount),
        invalidStakeCount: totals.invalidStakeCount + (unitStake === null ? 1 : 0),
      };
    },
    { itemCount: 0, lineCount: 0, totalStake: 0, invalidStakeCount: 0 },
  );
}

export function getSingleBetTapDecision(
  pendingBetId: string | null | undefined,
  basketItemIds: readonly string[],
  tappedId: string,
): SingleBetTapDecision {
  if (pendingBetId === tappedId) {
    return "clear-pending";
  }

  if (basketItemIds.includes(tappedId)) {
    return "ignore-basket-item";
  }

  return "set-pending";
}

export function getComboPendingDecision(
  pendingBetType: RaceBetType | null | undefined,
  nextWinHorseNo: string | null,
  nextPlaceHorseNo: string | null,
): ComboPendingDecision {
  if (
    nextWinHorseNo &&
    nextPlaceHorseNo &&
    nextWinHorseNo !== nextPlaceHorseNo
  ) {
    return "set-pending";
  }

  return pendingBetType === "WIN_PLACE_COMBO"
    ? "clear-pending"
    : "keep-pending";
}

export function validateLockedOddsQuote({
  quotedOdds,
  currentOdds,
  oddsAvailable,
}: {
  quotedOdds: string;
  currentOdds: string | undefined;
  oddsAvailable: boolean | undefined;
}) {
  const quoted = parseOdds(quotedOdds);
  const current = oddsAvailable ? parseOdds(currentOdds) : null;
  if (quoted === null || current === null) {
    return { ok: false as const, reason: "unavailable" as const };
  }

  if (Math.abs(quoted - current) > 0.001) {
    return { ok: false as const, reason: "changed" as const };
  }

  return { ok: true as const, lockedWinOdds: current };
}

export function validateLockedWinOddsQuote({
  quotedWinOdds,
  currentWinOdds,
  oddsAvailable,
}: {
  quotedWinOdds: string;
  currentWinOdds: string | undefined;
  oddsAvailable: boolean | undefined;
}) {
  return validateLockedOddsQuote({
    quotedOdds: quotedWinOdds,
    currentOdds: currentWinOdds,
    oddsAvailable,
  });
}

export function findSelectedRunner(runners: readonly HkjcRunner[], selectedHorseNo: string) {
  return runners.find((runner) => runner.horseNo === selectedHorseNo) ?? runners[0] ?? null;
}
