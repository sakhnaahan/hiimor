import { LoginForm } from "@/components/auth-forms";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function LoginPage() {
  const language = await getCurrentLanguage();
  const t = getTranslations(language);

  return (
    <div className="grid grid-2 auth-shell">
      <section className="hero panel auth-hero" />
      <section className="panel auth-panel">
        <span className="auth-kicker">{t.brand}</span>
        <h2 className="section-title">{t.login}</h2>
        <LoginForm language={language} />
      </section>
    </div>
  );
}
