import type { HkjcRunner } from "@/lib/hkjc-racecard";
import { parseWinOdds } from "@/lib/hkjc-odds";

export type QuickStakeAction = "max" | "clear";

export function parseStakeInput(value: string) {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const amount = Number.parseInt(value, 10);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
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

export function canSubmitStake(stakeInput: string, balance: number) {
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

  return parseWinOdds(runner.winOdds);
}

export function calculatePotentialPayoutForRunner(stakeInput: string, runner: HkjcRunner | null | undefined) {
  const lockedOdds = getRunnerLockedWinOdds(runner);
  return lockedOdds === null ? 0 : calculatePotentialPayout(stakeInput, lockedOdds);
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
  const quoted = parseWinOdds(quotedWinOdds);
  const current = oddsAvailable ? parseWinOdds(currentWinOdds) : null;
  if (quoted === null || current === null) {
    return { ok: false as const, reason: "unavailable" as const };
  }

  if (Math.abs(quoted - current) > 0.001) {
    return { ok: false as const, reason: "changed" as const };
  }

  return { ok: true as const, lockedWinOdds: current };
}

export function findSelectedRunner(runners: readonly HkjcRunner[], selectedHorseNo: string) {
  return runners.find((runner) => runner.horseNo === selectedHorseNo) ?? runners[0] ?? null;
}
