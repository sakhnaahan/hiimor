"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { getTranslations, type Language } from "@/lib/i18n";

type ActionFormContext = {
  pending: boolean;
  message: React.ReactNode;
};

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  className?: string;
  initialMessage?: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  pendingLabel?: string;
  language?: Language;
  children: React.ReactNode | ((context: ActionFormContext) => React.ReactNode);
};

export function ActionForm({
  action,
  className = "form",
  initialMessage,
  onSubmit,
  submitLabel,
  pendingLabel,
  language = "mn",
  children,
}: Props) {
  const t = getTranslations(language);
  const [state, formAction, pending] = useActionState(action, { message: initialMessage });
  const message = state.message ? (
    <p className={`message ${state.ok ? "ok" : "error"}`}>{state.message}</p>
  ) : null;

  return (
    <form action={formAction} className={className} onSubmit={onSubmit}>
      {typeof children === "function" ? (
        children({ pending, message })
      ) : (
        <>
          {children}
          <button className="button" type="submit" disabled={pending}>
            {pending ? (pendingLabel ?? t.working) : (submitLabel ?? t.submit)}
          </button>
          {message}
        </>
      )}
    </form>
  );
}
