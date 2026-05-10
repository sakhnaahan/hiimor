import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { AdminMobileMenu } from "@/components/admin-mobile-menu";
import { LanguageSwitch } from "@/components/language-switch";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { getCurrentUser } from "@/lib/auth";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { formatCoins } from "@/lib/format";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";
import "./globals.css";

export const metadata: Metadata = {
  title: "Морин уралдаан",
  description: "Хувийн морин уралдааны бооцооны апп",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureBootstrapData();
  const [user, language] = await Promise.all([getCurrentUser(), getCurrentLanguage()]);
  const t = getTranslations(language);
  const isPlayer = user?.role === "player";
  const isAdmin = user?.role === "admin";

  return (
    <html lang={language}>
      <body>
        <div className={`page ${isPlayer ? "player-mobile-shell" : ""} ${isAdmin ? "admin-mobile-shell" : ""}`}>
          <header className={`topbar ${isPlayer ? "player-topbar" : ""} ${isAdmin ? "admin-topbar" : ""}`}>
            <div className="shell topbar-inner">
              <Link href={user ? (user.role === "admin" ? "/admin" : "/race") : "/login"} className="brand">
                {t.brand}
              </Link>
              <nav className="nav topbar-nav">
                {user ? (
                  <>
                    <span className="nav-balance">
                      {t.balance}: {formatCoins(user.coinBalance, language)}
                    </span>
                    <Link href="/race">{t.navRace}</Link>
                    <Link href="/history">{t.navHistory}</Link>
                    <Link href="/account">{t.navAccount}</Link>
                    {user.role === "admin" ? <Link href="/admin">{t.navAdmin}</Link> : null}
                    <form action={logoutAction}>
                      <button className="link-button" type="submit">
                        {t.logout}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login">{t.navLogin}</Link>
                    <Link href="/signup">{t.navSignup}</Link>
                  </>
                )}
                <LanguageSwitch language={language} label={t.selectedLanguage} />
              </nav>
              {isAdmin ? <AdminMobileMenu language={language} /> : null}
            </div>
          </header>
          <main className="shell main">{children}</main>
          {isPlayer ? <MobileBottomNav language={language} /> : null}
        </div>
      </body>
    </html>
  );
}
