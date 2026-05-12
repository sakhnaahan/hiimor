"use client";

import Link from "next/link";
import { loginAction, signupAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PasswordField } from "@/components/password-field";
import { getTranslations, type Language } from "@/lib/i18n";

export function SignupForm({ language }: { language: Language }) {
  const t = getTranslations(language);

  return (
    <ActionForm action={signupAction} language={language}>
      <div className="field">
        <label htmlFor="username">{t.username}</label>
        <input
          className="input"
          id="username"
          name="username"
          autoComplete="username"
          required
        />
      </div>
      <PasswordField
        id="password"
        name="password"
        label={t.password}
        autoComplete="new-password"
        language={language}
        minLength={8}
        required
      />
      <p className="muted auth-alt-link">
        {t.alreadyRegistered} <Link href="/login">{t.logIn}</Link>.
      </p>
    </ActionForm>
  );
}

export function LoginForm({ language }: { language: Language }) {
  const t = getTranslations(language);

  return (
    <ActionForm action={loginAction} language={language}>
      <div className="field">
        <label htmlFor="username">{t.username}</label>
        <input
          className="input"
          id="username"
          name="username"
          autoComplete="username"
          required
        />
      </div>
      <PasswordField
        id="password"
        name="password"
        label={t.password}
        autoComplete="current-password"
        language={language}
        required
      />
      <p className="muted">{t.forgotPassword}</p>
      <p className="muted auth-alt-link">
        {t.needAccount} <Link href="/signup">{t.requestSignup}</Link>.
      </p>
    </ActionForm>
  );
}
