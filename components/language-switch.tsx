"use client";

import { useRouter } from "next/navigation";
import { LANGUAGE_COOKIE_NAME, type Language } from "@/lib/i18n";

export function LanguageSwitch({ language, label }: { language: Language; label: string }) {
  const router = useRouter();

  function setLanguage(nextLanguage: Language) {
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${nextLanguage}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="language-switch" aria-label={label}>
      <button
        aria-pressed={language === "mn"}
        className={language === "mn" ? "active" : ""}
        onClick={() => setLanguage("mn")}
        type="button"
      >
        MN
      </button>
      <button
        aria-pressed={language === "en"}
        className={language === "en" ? "active" : ""}
        onClick={() => setLanguage("en")}
        type="button"
      >
        EN
      </button>
    </div>
  );
}
