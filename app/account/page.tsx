import { ChangePasswordForm } from "@/components/account-forms";
import { LanguageSwitch } from "@/components/language-switch";
import { logoutAction } from "@/app/actions";
import { requireApprovedUser } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function AccountPage() {
  const user = await requireApprovedUser();
  const language = await getCurrentLanguage();
  const t = getTranslations(language);

  return (
    <div className="grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">{t.profile}</h2>
          </div>
        </div>

        {/* Warning */}
        <div
          style={{
            marginBottom: "1rem",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            color: "#93c5fd",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          ℹ️ Энэхүү платформ нь морин уралдаан болон betting system-ийн
          ажиллагааг сонирхогчид, суралцагчдад танилцуулах demo платформ болно.
          Бодит мөнгөний бооцоо болон санхүүгийн гүйлгээ хийгдэхгүй.
        </div>

        <div className="race-status-strip account-summary">
          <div>
            <span className="badge-label">{t.username}</span>
            <strong>{user.username}</strong>
          </div>

          {/* <div className="account-language-card">
            <span className="badge-label">{t.selectedLanguage}</span>
            <LanguageSwitch language={language} label={t.selectedLanguage} />
          </div> */}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">{t.changePassword}</h2>
        <ChangePasswordForm language={language} />
      </section>

      <section className="panel">
        <form action={logoutAction}>
          <button className="button secondary" type="submit">
            {t.logout}
          </button>
        </form>
      </section>
    </div>
  );
}
