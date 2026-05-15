import { SignupForm } from "@/components/auth-forms";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function SignupPage() {
  const language = await getCurrentLanguage();
  const t = getTranslations(language);

  return (
    <div className="auth-shell">
      <section className="panel auth-panel">
        <h2 className="section-title">{t.signup}</h2>
        <SignupForm language={language} />
      </section>
    </div>
  );
}
