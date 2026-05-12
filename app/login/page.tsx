import { LoginForm } from "@/components/auth-forms";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function LoginPage() {
  const language = await getCurrentLanguage();
  const t = getTranslations(language);

  return (
    <div className="auth-shell xl:flex sm:">
      <section className="hero panel auth-hero w-full " />
      <section className="panel auth-panel border  ">
        <h2 className="section-title">{t.login}</h2>
        <LoginForm language={language} />
      </section>
    </div>
  );
}
