import type { HkjcQuinellaOdds } from "@/lib/hkjc-odds";
import { parseOdds } from "@/lib/hkjc-odds";
import type { HkjcRunner } from "@/lib/hkjc-racecard";
import { MIN_BET_AMOUNT } from "@/lib/rules";

export type QuickStakeAction = "max" | "clear";
export type RaceBetType =
  | "WIN"
  | "PLACE"
  | "WIN_PLACE"
  | "WIN_PLACE_COMBO"
  | "QUINELLA";
export type RaceBetLineType = "WIN" | "PLACE" | "QUINELLA";
export type SingleBetTapDecision = "clear-pending" | "ignore-basket-item" | "set-pending";
export type ComboPendingDecision = "clear-pending" | "keep-pending" | "set-pending";
export type QuinellaPendingDecision = "clear-pending" | "keep-pending" | "set-pending";
export type MobileBetMode = "win-place" | "combo-wp" | "quinella";
export type PendingBetClearMode = "none" | "combo-only" | "all";

export const QUINELLA_MAX_LEGS = 5;

export type QuinellaDraft = {
  bankerHorseNo: string | null;
  legHorseNos: string[];
};

export type QuinellaInspectedPair = {
  rowHorseNo: string;
  columnHorseNo: string;
};

export type QuinellaHighlightedCell = {
  horseNo: string;
  odds: string | null;
  displayOdds: string | null;
  isDiagonal: boolean;
  isBanker: boolean;
  isLeg: boolean;
  isHighlighted: boolean;
  isIntersection: boolean;
  isInspected: boolean;
};

export type QuinellaOddsMatrixRow = {
  horseNo: string;
  isInspected: boolean;
  cells: QuinellaHighlightedCell[];
};

export type QuinellaOddsMatrix = {
  horseNos: string[];
  inspectedRowHorseNo: string | null;
  inspectedColumnHorseNo: string | null;
  rows: QuinellaOddsMatrixRow[];
};

export type RaceBasketTotalItem = {
  betType: RaceBetType;
  unitBetAmount: string | number;
  quinellaLegHorseNos?: readonly string[];
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

export function buildQuinellaPairKey(horseNoA: string, horseNoB: string) {
  const horseNos = [horseNoA, horseNoB].sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));
  return `${horseNos[0]}|${horseNos[1]}`;
}

export function getBetLineTypes(betType: RaceBetType): RaceBetLineType[] {
  if (betType === "WIN_PLACE_COMBO") {
    return ["WIN"];
  }

  if (betType === "QUINELLA") {
    return ["QUINELLA"];
  }

  return betType === "WIN_PLACE" ? ["WIN", "PLACE"] : [betType];
}

export function getQuinellaLineCount(legHorseNos: readonly string[]) {
  return legHorseNos.length;
}

export function getBetLineCount(
  betType: RaceBetType,
  options: {
    quinellaLegHorseNos?: readonly string[];
  } = {},
) {
  if (betType === "QUINELLA") {
    return getQuinellaLineCount(options.quinellaLegHorseNos ?? []);
  }

  return getBetLineTypes(betType).length;
}

export function getTotalStake(stakeInput: string, betType: RaceBetType, options?: { quinellaLegHorseNos?: readonly string[] }) {
  const stake = parseStakeInput(stakeInput);
  return stake === null ? null : stake * getBetLineCount(betType, options);
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

export function getQuinellaOddsValue(
  quinellaOdds: readonly HkjcQuinellaOdds[],
  horseNoA: string,
  horseNoB: string,
) {
  const pairKey = buildQuinellaPairKey(horseNoA, horseNoB);
  const entry = quinellaOdds.find(
    (oddsEntry) => buildQuinellaPairKey(oddsEntry.horseNoA, oddsEntry.horseNoB) === pairKey,
  );
  return parseOdds(entry?.odds);
}

export function calculatePotentialPayoutForRunner(
  stakeInput: string,
  runner: HkjcRunner | null | undefined,
  betType: RaceBetType = "WIN",
) {
  if (betType === "WIN_PLACE_COMBO" || betType === "QUINELLA") {
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

export function calculateQuinellaPayout(
  stakeInput: string,
  quinellaOdds: readonly HkjcQuinellaOdds[],
  bankerHorseNo: string,
  legHorseNos: readonly string[],
) {
  const stake = parseStakeInput(stakeInput);
  if (stake === null) {
    return 0;
  }

  return legHorseNos.reduce((total, legHorseNo) => {
    const lockedOdds = getQuinellaOddsValue(quinellaOdds, bankerHorseNo, legHorseNo);
    return total + (lockedOdds === null ? 0 : Math.floor(stake * lockedOdds));
  }, 0);
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
      const lineCount = getBetLineCount(item.betType, {
        quinellaLegHorseNos: item.quinellaLegHorseNos,
      });

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
  if (nextWinHorseNo && nextPlaceHorseNo && nextWinHorseNo !== nextPlaceHorseNo) {
    return "set-pending";
  }

  return pendingBetType === "WIN_PLACE_COMBO" ? "clear-pending" : "keep-pending";
}

export function createEmptyQuinellaDraft(): QuinellaDraft {
  return {
    bankerHorseNo: null,
    legHorseNos: [],
  };
}

export function selectQuinellaBanker(draft: QuinellaDraft, horseNo: string): QuinellaDraft {
  return {
    bankerHorseNo: horseNo,
    legHorseNos: draft.legHorseNos.filter((legHorseNo) => legHorseNo !== horseNo),
  };
}

export function toggleQuinellaLeg(draft: QuinellaDraft, horseNo: string): QuinellaDraft {
  if (draft.bankerHorseNo === horseNo) {
    return draft;
  }

  if (draft.legHorseNos.includes(horseNo)) {
    return {
      ...draft,
      legHorseNos: draft.legHorseNos.filter((legHorseNo) => legHorseNo !== horseNo),
    };
  }

  if (draft.legHorseNos.length >= QUINELLA_MAX_LEGS) {
    return draft;
  }

  return {
    ...draft,
    legHorseNos: [...draft.legHorseNos, horseNo].sort(
      (left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10),
    ),
  };
}

export function isValidQuinellaDraft(draft: QuinellaDraft) {
  return Boolean(
    draft.bankerHorseNo &&
      draft.legHorseNos.length >= 1 &&
      draft.legHorseNos.length <= QUINELLA_MAX_LEGS &&
      !draft.legHorseNos.includes(draft.bankerHorseNo),
  );
}

export function getQuinellaPendingDecision(
  pendingBetType: RaceBetType | null | undefined,
  nextDraft: QuinellaDraft,
  hasQuotedOdds: boolean,
): QuinellaPendingDecision {
  if (isValidQuinellaDraft(nextDraft) && hasQuotedOdds) {
    return "set-pending";
  }

  return pendingBetType === "QUINELLA" ? "clear-pending" : "keep-pending";
}

export function buildQuinellaQuotedOddsMap(
  quinellaOdds: readonly HkjcQuinellaOdds[],
  bankerHorseNo: string | null,
  legHorseNos: readonly string[],
) {
  if (!bankerHorseNo) {
    return null;
  }

  const entries = legHorseNos.map((legHorseNo) => {
    const pairKey = buildQuinellaPairKey(bankerHorseNo, legHorseNo);
    const oddsEntry = quinellaOdds.find(
      (entry) => buildQuinellaPairKey(entry.horseNoA, entry.horseNoB) === pairKey,
    );
    return oddsEntry ? [legHorseNo, oddsEntry.odds] : null;
  });

  if (entries.some((entry) => entry === null)) {
    return null;
  }

  return Object.fromEntries(entries as Array<[string, string]>);
}

export function formatQuinellaMatrixDisplayOdds(odds: string | null | undefined) {
  const parsedOdds = parseOdds(odds);
  if (parsedOdds === null) {
    return null;
  }

  return String(Math.round(parsedOdds));
}

export function buildQuinellaOddsMatrix(
  runners: readonly HkjcRunner[],
  quinellaOdds: readonly HkjcQuinellaOdds[],
  bankerHorseNo: string | null,
  legHorseNos: readonly string[],
  inspectedPair: QuinellaInspectedPair | null = null,
): QuinellaOddsMatrix {
  const horseNos = runners
    .map((runner) => runner.horseNo)
    .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));

  return {
    horseNos,
    inspectedRowHorseNo: inspectedPair?.rowHorseNo ?? null,
    inspectedColumnHorseNo: inspectedPair?.columnHorseNo ?? null,
    rows: horseNos.map((rowHorseNo) => ({
      horseNo: rowHorseNo,
      isInspected: inspectedPair?.rowHorseNo === rowHorseNo,
      cells: horseNos.map((columnHorseNo) => {
        if (rowHorseNo === columnHorseNo) {
          return {
            horseNo: columnHorseNo,
            odds: null,
            displayOdds: null,
            isDiagonal: true,
            isBanker: bankerHorseNo === columnHorseNo,
            isLeg: legHorseNos.includes(columnHorseNo),
            isHighlighted: false,
            isIntersection: false,
            isInspected: false,
          };
        }

        const oddsValue = quinellaOdds.find(
          (entry) => buildQuinellaPairKey(entry.horseNoA, entry.horseNoB) === buildQuinellaPairKey(rowHorseNo, columnHorseNo),
        )?.odds;
        const rowHighlighted = rowHorseNo === bankerHorseNo || legHorseNos.includes(rowHorseNo);
        const columnHighlighted = columnHorseNo === bankerHorseNo || legHorseNos.includes(columnHorseNo);
        const isIntersection =
          Boolean(bankerHorseNo) &&
          ((rowHorseNo === bankerHorseNo && legHorseNos.includes(columnHorseNo)) ||
            (columnHorseNo === bankerHorseNo && legHorseNos.includes(rowHorseNo)));
        const isInspected =
          inspectedPair?.rowHorseNo === rowHorseNo &&
          inspectedPair.columnHorseNo === columnHorseNo;

        return {
          horseNo: columnHorseNo,
          odds: oddsValue ?? null,
          displayOdds: formatQuinellaMatrixDisplayOdds(oddsValue),
          isDiagonal: false,
          isBanker: bankerHorseNo === columnHorseNo || bankerHorseNo === rowHorseNo,
          isLeg: legHorseNos.includes(columnHorseNo) || legHorseNos.includes(rowHorseNo),
          isHighlighted: rowHighlighted || columnHighlighted,
          isIntersection,
          isInspected,
        };
      }),
    })),
  };
}

export function getMobileBetModeTransition(
  previousMode: MobileBetMode,
  nextMode: MobileBetMode,
): {
  clearComboDraft: boolean;
  clearPendingBet: PendingBetClearMode;
} {
  if (previousMode === nextMode) {
    return {
      clearComboDraft: false,
      clearPendingBet: "none",
    };
  }

  if (nextMode === "quinella") {
    return {
      clearComboDraft: true,
      clearPendingBet: "all",
    };
  }

  if (nextMode === "combo-wp" && previousMode !== "combo-wp") {
    return {
      clearComboDraft: false,
      clearPendingBet: "all",
    };
  }

  if (previousMode === "combo-wp" && nextMode !== "combo-wp") {
    return {
      clearComboDraft: true,
      clearPendingBet: "combo-only",
    };
  }

  return {
    clearComboDraft: false,
    clearPendingBet: "none",
  };
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

export function validateLockedQuinellaOddsQuote({
  quotedQuinellaOdds,
  currentQuinellaOdds,
}: {
  quotedQuinellaOdds: string;
  currentQuinellaOdds: string | undefined;
}) {
  return validateLockedOddsQuote({
    quotedOdds: quotedQuinellaOdds,
    currentOdds: currentQuinellaOdds,
    oddsAvailable: Boolean(currentQuinellaOdds),
  });
}

export function findSelectedRunner(runners: readonly HkjcRunner[], selectedHorseNo: string) {
  return runners.find((runner) => runner.horseNo === selectedHorseNo) ?? runners[0] ?? null;
}
