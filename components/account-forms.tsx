"use client";

import { changePasswordAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PasswordField } from "@/components/password-field";
import { getTranslations, type Language } from "@/lib/i18n";

export function ChangePasswordForm({ language }: { language: Language }) {
  const t = getTranslations(language);

  return (
    <ActionForm action={changePasswordAction} language={language} submitLabel={t.changePassword} pendingLabel={t.changing}>
      <PasswordField
        id="currentPassword"
        name="currentPassword"
        label={t.currentPassword}
        autoComplete="current-password"
        language={language}
        required
      />
      <PasswordField
        id="newPassword"
        name="newPassword"
        label={t.newPassword}
        autoComplete="new-password"
        language={language}
        minLength={8}
        required
      />
      <PasswordField
        id="confirmNewPassword"
        name="confirmNewPassword"
        label={t.confirmNewPassword}
        autoComplete="new-password"
        language={language}
        minLength={8}
        required
      />
    </ActionForm>
  );
}
