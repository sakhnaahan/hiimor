import type { Language } from "@/lib/i18n";

function localeFor(language: Language) {
  return language === "mn" ? "mn-MN" : "en";
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
