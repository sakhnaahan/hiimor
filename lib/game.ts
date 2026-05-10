import { DEFAULT_MULTIPLIER, HORSES } from "@/lib/constants";

export type RaceOutcome = {
  winningHorse: string;
  isWin: boolean;
  payout: number;
};

export function calculateRaceOutcome(
  selectedHorse: string,
  betAmount: number,
  payoutMultiplier: number,
  randomValue = Math.random(),
  horses: readonly string[] = HORSES,
): RaceOutcome {
  if (horses.length === 0) {
    throw new Error("At least one horse is required to calculate a race outcome.");
  }

  const index = Math.min(Math.floor(randomValue * horses.length), horses.length - 1);
  const winningHorse = horses[index];
  const isWin = winningHorse === selectedHorse;
  const multiplier = Number.isFinite(payoutMultiplier) ? payoutMultiplier : DEFAULT_MULTIPLIER;

  return {
    winningHorse,
    isWin,
    payout: isWin ? Math.floor(betAmount * multiplier) : 0,
  };
}

export function applyRaceBalance(balance: number, betAmount: number, payout: number) {
  const balanceAfterBet = balance - betAmount;
  return {
    balanceAfterBet,
    finalBalance: balanceAfterBet + payout,
  };
}
