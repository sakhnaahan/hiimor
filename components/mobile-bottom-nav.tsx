"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { getTranslations, type Language } from "@/lib/i18n";

type MobileNavIcon = "race" | "history" | "account" | "logout";

function NavIcon({ icon }: { icon: MobileNavIcon }) {
  if (icon === "race") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 15h9l4-5 3 5" />
        <path d="M6 15v4" />
        <path d="M14 15v4" />
        <path d="M10 9h4l2 3" />
      </svg>
    );
  }

  if (icon === "history") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 12a8 8 0 1 0 2.3-5.6" />
        <path d="M4 5v5h5" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (icon === "account") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M10 6H6v12h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M8 12h10" />
    </svg>
  );
}

export function MobileBottomNav({ language }: { language: Language }) {
  const pathname = usePathname();
  const t = getTranslations(language);
  const items = [
    { href: "/race", label: t.navRace, icon: "race" as const },
    { href: "/history", label: t.navHistory, icon: "history" as const },
    { href: "/account", label: t.navAccount, icon: "account" as const },
  ];
  return (
    <nav className="mobile-bottom-nav" aria-label="Player navigation">
      <div className="mobile-bottom-actions">
        {items.map((item) => (
          <Link
            aria-current={pathname === item.href ? "page" : undefined}
            className={pathname === item.href ? "active" : ""}
            href={item.href}
            key={item.href}
          >
            <NavIcon icon={item.icon} />
            {item.label}
          </Link>
        ))}
        <form action={logoutAction}>
          <button type="submit">
            <NavIcon icon="logout" />
            {t.logout}
          </button>
        </form>
      </div>
    </nav>
  );
}
