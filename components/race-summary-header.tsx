"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa6";
import { RaceCourseMap } from "@/components/race-course-map";
import type { HkjcRaceCard } from "@/lib/hkjc-racecard";
import { getTranslations, type Language } from "@/lib/i18n";
import type { MobileBetMode } from "@/lib/race-betting-ui";

function getMobileBetModeLabel(
  mode: MobileBetMode,
  t: ReturnType<typeof getTranslations>,
) {
  if (mode === "combo-wp") {
    return t.comboWp;
  }

  if (mode === "quinella") {
    return t.quinella;
  }

  return t.winPlace;
}

export function RaceSummaryHeader({
  raceCard,
  raceDetails,
  pendingRaceCount,
  liveStreamUrl,
  language,
  mobileBetMode,
  mobileBetMenuOpen,
  onOpenBetMenu,
  onCloseBetMenu,
  onSelectBetMode,
}: {
  raceCard: HkjcRaceCard;
  raceDetails: string;
  pendingRaceCount: number;
  liveStreamUrl: string;
  language: Language;
  mobileBetMode: MobileBetMode;
  mobileBetMenuOpen: boolean;
  onOpenBetMenu: () => void;
  onCloseBetMenu: () => void;
  onSelectBetMode: (mode: MobileBetMode) => void;
}) {
  const t = getTranslations(language);
  const compactDetails = [
    raceCard.racecourse,
    raceCard.startTime,
    raceCard.distance,
    raceCard.going,
  ]
    .filter(Boolean)
    .join(" / ");
  const mobileDetailLines = [
    [raceCard.meetingDate, raceCard.startTime].filter(Boolean).join(", "),
    [raceCard.raceClass, raceCard.distance, raceCard.surface]
      .filter(Boolean)
      .join(", "),
    [raceCard.course ? `"${raceCard.course}" COURSE` : null, raceCard.going]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);
  const wagerMenuRef = useRef<HTMLDivElement | null>(null);
  const wagerButtonRef = useRef<HTMLButtonElement | null>(null);
  const wagerMenuId = `race-mobile-wager-menu-${raceCard.raceNo}`;
  const activeBetLabel = getMobileBetModeLabel(mobileBetMode, t);
  const [wagerMenuStyle, setWagerMenuStyle] = useState<{
    top: number;
    right: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!mobileBetMenuOpen) {
      return;
    }

    function syncMenuPosition() {
      const buttonRect = wagerButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) {
        return;
      }

      setWagerMenuStyle({
        top: buttonRect.bottom + 8,
        right: Math.max(10, window.innerWidth - buttonRect.right),
        width: Math.min(240, window.innerWidth - 20),
      });
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        !wagerMenuRef.current?.contains(target) &&
        !wagerButtonRef.current?.contains(target)
      ) {
        onCloseBetMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseBetMenu();
      }
    }

    syncMenuPosition();
    window.addEventListener("resize", syncMenuPosition);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", syncMenuPosition);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileBetMenuOpen, onCloseBetMenu]);

  return (
    <div className="race-summary-wrap">
      <div className="race-app-hero">
        <div>
          <span className="race-app-mark">{t.brand}</span>
          <strong>
            {t.race} {raceCard.raceNo}
          </strong>
        </div>
      </div>

      <div className="race-notice-strip">
        <span>!</span>
        <strong>
          {raceCard.oddsAvailable ? t.liveOdds : t.racecardUnavailable}
        </strong>
        <a
          href={liveStreamUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t.watchLive}
        </a>
      </div>

      <div className="race-summary-header">
        <div className="race-summary-main">
          <div className="race-kicker">
            <span>
              {t.race} {raceCard.raceNo}
            </span>
            <span>{raceCard.meetingDate}</span>
          </div>
          <h1 className="race-title">{raceCard.raceName}</h1>
          <p className="muted race-summary-line">{compactDetails}</p>
          {raceDetails ? (
            <p className="muted race-summary-desktop-line ">{raceDetails}</p>
          ) : null}
          <p className="race-mobile-details">
            {mobileDetailLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        </div>
        <RaceCourseMap raceCard={raceCard} />
        <div className="race-mobile-wager" ref={wagerMenuRef}>
          <button
            aria-controls={wagerMenuId}
            aria-expanded={mobileBetMenuOpen}
            className="race-mobile-wager-button"
            ref={wagerButtonRef}
            onClick={() =>
              mobileBetMenuOpen ? onCloseBetMenu() : onOpenBetMenu()
            }
            type="button"
          >
            <strong>{activeBetLabel}</strong>
            <span aria-hidden="true">
              <FaChevronDown />
            </span>
          </button>
          {mobileBetMenuOpen ? (
            <div
              className="race-mobile-wager-menu"
              id={wagerMenuId}
              role="menu"
              style={wagerMenuStyle ?? undefined}
            >
              {(
                [
                  { mode: "win-place", label: t.winPlace },
                  { mode: "combo-wp", label: t.comboWp },
                  { mode: "quinella", label: t.quinella },
                ] as const
              ).map((item) => (
                <button
                  aria-pressed={mobileBetMode === item.mode}
                  className={mobileBetMode === item.mode ? "active" : ""}
                  key={item.mode}
                  onClick={() => onSelectBetMode(item.mode)}
                  role="menuitem"
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
