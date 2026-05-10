"use client";

import { useState, type InputHTMLAttributes } from "react";
import { getTranslations, type Language } from "@/lib/i18n";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  language?: Language;
};

export function PasswordField({ className = "input", id, label, language = "mn", ...inputProps }: Props) {
  const [visible, setVisible] = useState(false);
  const t = getTranslations(language);
  const inputId = id ?? String(inputProps.name ?? "password");

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input-wrap">
        <input {...inputProps} className={className} id={inputId} type={visible ? "text" : "password"} />
        <button
          aria-label={visible ? t.hidePassword : t.showPassword}
          aria-pressed={visible}
          className="password-visibility-button"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M3 3 L21 21" />
              <path d="M10.6 10.7 A2 2 0 0 0 13.3 13.4" />
              <path d="M9.1 5.3 A9.8 9.8 0 0 1 12 4.9 C17 4.9 20.7 9.1 22 12 C21.5 13.1 20.5 14.6 19 15.9" />
              <path d="M6.5 6.7 C4.3 8.1 2.9 10.2 2 12 C3.3 14.9 7 19.1 12 19.1 C13.4 19.1 14.7 18.8 15.9 18.2" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M2 12 C3.3 9.1 7 4.9 12 4.9 C17 4.9 20.7 9.1 22 12 C20.7 14.9 17 19.1 12 19.1 C7 19.1 3.3 14.9 2 12 Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
