"use client";

import {
  rechargeUserAction,
  resetUserPasswordAction,
  subtractUserCoinsAction,
} from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { getTranslations, type Language } from "@/lib/i18n";

type UserOption = {
  id: number;
  username: string;
  coinBalance: number;
};

export function RechargeForm({ users, language }: { users: UserOption[]; language: Language }) {
  const t = getTranslations(language);

  return (
    <ActionForm action={rechargeUserAction} language={language}>
      <div className="field">
        <label htmlFor="userId">{t.player}</label>
        <select className="select" id="userId" name="userId" required>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username} ({user.coinBalance} {language === "mn" ? "коин" : "coins"})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="amount">{t.coinsToAdd}</label>
        <input className="input" id="amount" name="amount" type="number" min="1" required />
      </div>
    </ActionForm>
  );
}

export function SubtractCoinsForm({ users, language }: { users: UserOption[]; language: Language }) {
  const t = getTranslations(language);

  return (
    <ActionForm action={subtractUserCoinsAction} language={language}>
      <div className="field">
        <label htmlFor="subtractUserId">{t.player}</label>
        <select className="select" id="subtractUserId" name="userId" required>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username} ({user.coinBalance} {language === "mn" ? "коин" : "coins"})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="subtractAmount">{t.coinsToSubtract}</label>
        <input className="input" id="subtractAmount" name="amount" type="number" min="1" required />
      </div>
    </ActionForm>
  );
}

export function ResetPasswordForm({
  users,
  language,
}: {
  users: Pick<UserOption, "id" | "username">[];
  language: Language;
}) {
  const t = getTranslations(language);

  return (
    <ActionForm action={resetUserPasswordAction} language={language} submitLabel={t.resetPassword} pendingLabel={t.resetting}>
      <div className="field">
        <label htmlFor="resetPasswordUserId">{t.user}</label>
        <select className="select" id="resetPasswordUserId" name="userId" required>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
      </div>
    </ActionForm>
  );
}
