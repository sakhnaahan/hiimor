"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions";
import { LanguageSwitch } from "@/components/language-switch";
import { getTranslations, type Language } from "@/lib/i18n";

export function AdminMobileMenu({ language }: { language: Language }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = getTranslations(language);
  const links = [
    { href: "/admin", label: t.adminOverview },
    { href: "/race", label: t.navRace },
    { href: "/admin/users", label: t.users },
    { href: "/admin/bets", label: t.bets },
    { href: "/admin/transactions", label: t.transactions },
    { href: "/account", label: t.navAccount },
  ];

  return (
    <div className="admin-mobile-menu">
      <button
        aria-expanded={open}
        aria-label={open ? t.closeMenu : t.menu}
        className="admin-menu-toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
      {open ? (
        <div className="admin-menu-panel">
          <nav aria-label={t.navAdmin}>
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={active ? "active" : ""}
                  href={link.href}
                  key={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="admin-menu-footer">
            <LanguageSwitch language={language} label={t.selectedLanguage} />
            <form action={logoutAction}>
              <button className="link-button" type="submit">
                {t.logout}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
