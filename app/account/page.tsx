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
            <p className="muted">{t.manageAccount}</p>
          </div>
        </div>
        <div className="race-status-strip account-summary">
          <div>
            <span className="badge-label">{t.username}</span>
            <strong>{user.username}</strong>
          </div>
          <div className="account-language-card">
            <span className="badge-label">{t.selectedLanguage}</span>
            <LanguageSwitch language={language} label={t.selectedLanguage} />
          </div>
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
