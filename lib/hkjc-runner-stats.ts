import type { HkjcRaceCard, HkjcRunner } from "@/lib/hkjc-racecard";

export type RunnerStatSignalTone = "positive" | "warning" | "neutral";

export type RunnerStatSignal = {
  label: string;
  tone: RunnerStatSignalTone;
};

function parseNumber(value: string) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function parseDistanceMeters(distance: string) {
  const match = distance.match(/(\d+)\s*M/i);
  if (!match) {
    return null;
  }

  return parseNumber(match[1]);
}

function getRunnerNumbers(runners: HkjcRunner[], field: "draw" | "weight") {
  return runners
    .map((runner) => parseNumber(runner[field]))
    .filter((value): value is number => value !== null);
}

function hasFirstTimeGear(gear: string) {
  return /(^|[^A-Z0-9])[A-Z]{1,4}1(?=$|[^A-Z0-9])/i.test(gear);
}

function hasGoodRecentForm(last6Runs: string) {
  return last6Runs
    .split(/[^0-9]+/)
    .filter(Boolean)
    .some((place) => ["1", "2", "3"].includes(place));
}

export function getRunnerStatSignals(raceCard: HkjcRaceCard, runner: HkjcRunner): RunnerStatSignal[] {
  const signals: RunnerStatSignal[] = [];
  const distanceMeters = parseDistanceMeters(raceCard.distance);
  const draw = parseNumber(runner.draw);
  const draws = getRunnerNumbers(raceCard.runners, "draw");
  const maxDraw = draws.length > 0 ? Math.max(...draws) : null;
  const isShortRace = distanceMeters !== null && distanceMeters <= 1200;

  if (isShortRace && draw !== null && draw >= 1 && draw <= 3) {
    signals.push({ label: "Inside draw", tone: "positive" });
  } else if (isShortRace && draw !== null && maxDraw !== null && maxDraw >= 8 && draw >= maxDraw - 2) {
    signals.push({ label: "Wide draw", tone: "warning" });
  }

  const weight = parseNumber(runner.weight);
  const weights = getRunnerNumbers(raceCard.runners, "weight");
  const minWeight = weights.length > 0 ? Math.min(...weights) : null;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : null;

  if (weight !== null && minWeight !== null && maxWeight !== null && minWeight !== maxWeight) {
    if (weight === minWeight) {
      signals.push({ label: "Light weight", tone: "positive" });
    }

    if (weight === maxWeight) {
      signals.push({ label: "Top weight", tone: "neutral" });
    }
  }

  if (hasFirstTimeGear(runner.gear)) {
    signals.push({ label: "First-time gear", tone: "neutral" });
  }

  if (!runner.last6Runs) {
    signals.push({ label: "Limited form", tone: "neutral" });
  } else if (hasGoodRecentForm(runner.last6Runs)) {
    signals.push({ label: "Good recent form", tone: "positive" });
  }

  return signals;
}
