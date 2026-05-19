import type { Language } from "@/lib/i18n";

function localeFor(language: Language) {
  return language === "mn" ? "mn-MN" : "en";
}

function formatRoundedKilograms(pounds: number, language: Language) {
  return `${Math.round(pounds * 0.45359237)}${language === "mn" ? "кг" : "kg"}`;
}

export function formatDate(value: Date, language: Language = "mn") {
  return new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function formatCoins(value: number, language: Language = "mn") {
  return new Intl.NumberFormat(localeFor(language)).format(value);
}

export function formatRunnerAssignedWeight(
  value: string | undefined,
  language: Language = "mn",
) {
  if (!value || language !== "mn") {
    return value ?? "";
  }

  const pounds = Number.parseInt(value, 10);
  if (!Number.isFinite(pounds)) {
    return value;
  }

  return formatRoundedKilograms(pounds, language);
}

export function formatRunnerHorseWeight(
  value: string | undefined,
  language: Language = "mn",
) {
  if (!value) {
    return value ?? "";
  }

  const pounds = Number.parseInt(value, 10);
  if (!Number.isFinite(pounds)) {
    return value;
  }

  return formatRoundedKilograms(pounds, language);
}

export function formatRunnerSex(
  value: string | undefined,
  language: Language = "mn",
) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (["f", "m", "female"].includes(normalized)) {
    return language === "mn" ? "Эм" : "Female";
  }

  if (["g", "c", "h", "r", "male"].includes(normalized)) {
    return language === "mn" ? "Эр" : "Male";
  }

  return "";
}

export type RunnerLast6Finish = {
  value: string;
  isHighlighted: boolean;
};

export function formatRunnerLast6Runs(
  value: string | undefined,
): RunnerLast6Finish[] {
  if (!value) {
    return [];
  }

  return value
    .split("/")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const place = Number.parseInt(entry, 10);
      return {
        value: entry,
        isHighlighted:
          Number.isFinite(place) &&
          String(place) === entry &&
          place >= 1 &&
          place <= 3,
      };
    });
}
