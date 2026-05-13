"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTranslations, type Language } from "@/lib/i18n";
import { GiHorseHead, GiTicket } from "react-icons/gi";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { BsThreeDots } from "react-icons/bs";
import { PiHorseFill } from "react-icons/pi";

type MobileNavIcon = "race" | "list" | "betslip" | "more";

function NavIcon({ icon }: { icon: MobileNavIcon }) {
  const className = "nav-icon";

  if (icon === "race") {
    return (
      <PiHorseFill
        className="nav-icon"
        style={{
          color: "#111827",
          fill: "currentColor",
          stroke: "currentColor",
        }}
      />
    );
  }

  if (icon === "list") {
    return <HiOutlineClipboardDocumentList className={className} />;
  }

  if (icon === "betslip") {
    return (
      <GiTicket
        className="nav-icon"
        style={{
          color: "#111827",
          fill: "currentColor",
          stroke: "currentColor",
        }}
      />
    );
  }

  return <BsThreeDots className={className} />;
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
    {
      activePath: "/race",
      href: "/race",
      label: t.navRace,
      icon: "race" as const,
    },
    {
      activePath: "/history",
      href: "/history",
      label: t.navHistory,
      icon: "list" as const,
    },
    {
      activePath: "/race",
      href: "/race#betslip",
      label: t.navBetslip,
      icon: "betslip" as const,
    },
    {
      activePath: "/account",
      href: "/account",
      label: t.navAccount,
      icon: "more" as const,
    },
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
