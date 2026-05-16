"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { RaceForm } from "@/components/race-form";
import { RaceSummaryHeader } from "@/components/race-summary-header";
import type { HkjcRaceCard } from "@/lib/hkjc-racecard";
import type { Language } from "@/lib/i18n";
import type { MobileBetMode } from "@/lib/race-betting-ui";

export function RaceBettingShell({
  balance,
  raceCard,
  raceDetails,
  pendingRaceCount,
  liveStreamUrl,
  language,
  children,
}: {
  balance: number;
  raceCard: HkjcRaceCard;
  raceDetails: string;
  pendingRaceCount: number;
  liveStreamUrl: string;
  language: Language;
  children?: ReactNode;
}) {
  const [mobileBetMode, setMobileBetMode] = useState<MobileBetMode>("win-place");
  const [mobileBetMenuOpen, setMobileBetMenuOpen] = useState(false);

  return (
    <>
      <RaceSummaryHeader
        language={language}
        liveStreamUrl={liveStreamUrl}
        mobileBetMenuOpen={mobileBetMenuOpen}
        mobileBetMode={mobileBetMode}
        onCloseBetMenu={() => setMobileBetMenuOpen(false)}
        onOpenBetMenu={() => setMobileBetMenuOpen(true)}
        onSelectBetMode={(mode) => {
          setMobileBetMode(mode);
          setMobileBetMenuOpen(false);
        }}
        pendingRaceCount={pendingRaceCount}
        raceCard={raceCard}
        raceDetails={raceDetails}
      />
      {children}
      <RaceForm
        balance={balance}
        language={language}
        mobileBetMode={mobileBetMode}
        onSelectBetMode={setMobileBetMode}
        raceCard={raceCard}
      />
    </>
  );
}
