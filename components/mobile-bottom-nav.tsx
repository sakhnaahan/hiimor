"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTranslations, type Language } from "@/lib/i18n";

type MobileNavIcon = "race" | "list" | "betslip" | "more";

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

  if (icon === "list") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M9 6h11" />
        <path d="M9 12h11" />
        <path d="M9 18h11" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </svg>
    );
  }

  if (icon === "betslip") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 3h8l3 3v15H7z" />
        <path d="M15 3v4h4" />
        <path d="M10 11h5" />
        <path d="M10 15h5" />
        <path d="M8 8h.01" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h.01" />
      <path d="M12 12h.01" />
      <path d="M19 12h.01" />
    </svg>
  );
}

export function MobileBottomNav({ language }: { language: Language }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const t = getTranslations(language);

  useEffect(() => {
    function updateHash() {
      setHash(window.location.hash);
    }

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const items = [
    { activePath: "/race", href: "/race", label: t.navRace, icon: "race" as const },
    { activePath: "/history", href: "/history", label: t.navHistory, icon: "list" as const },
    { activePath: "/race", href: "/race#betslip", label: t.navBetslip, icon: "betslip" as const },
    { activePath: "/account", href: "/account", label: t.navAccount, icon: "more" as const },
  ];

  function openBetSlip(event: MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/race") {
      return;
    }

    event.preventDefault();
    if (window.location.hash !== "#betslip") {
      window.location.hash = "betslip";
    }
    window.dispatchEvent(new Event("open-betslip"));
    setHash("#betslip");
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Player navigation">
      <div className="mobile-bottom-actions">
        {items.map((item) => {
          const isBetSlip = item.href.endsWith("#betslip");
          const active =
            pathname === item.activePath &&
            (isBetSlip ? hash === "#betslip" : hash !== "#betslip");

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? "active" : ""}
              href={item.href}
              key={item.href}
              onClick={isBetSlip ? openBetSlip : undefined}
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
