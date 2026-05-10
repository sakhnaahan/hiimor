import type { HkjcRaceCard } from "@/lib/hkjc-racecard";
import type { Language } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n";
import { RaceCourseMap } from "@/components/race-course-map";

export function RaceSummaryHeader({
  raceCard,
  raceDetails,
  pendingRaceCount,
  liveStreamUrl,
  language,
}: {
  raceCard: HkjcRaceCard;
  raceDetails: string;
  pendingRaceCount: number;
  liveStreamUrl: string;
  language: Language;
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

  return (
    <div className="race-summary-header">
      <div className="race-summary-main">
        <div className="race-kicker">
          <span>{t.race} {raceCard.raceNo}</span>
          <span>{raceCard.meetingDate}</span>
        </div>
        <h1 className="race-title">{raceCard.raceName}</h1>
        <p className="muted race-summary-line">{compactDetails}</p>
        {raceDetails ? <p className="muted race-summary-desktop-line">{raceDetails}</p> : null}
        <a className="button secondary race-live-link" href={liveStreamUrl} rel="noopener noreferrer" target="_blank">
          {t.watchLive}
        </a>
      </div>
      <RaceCourseMap raceCard={raceCard} />
      <div className="race-status-strip">
        <div>
          <span className="badge-label">{t.waitingResult}</span>
          <strong>{pendingRaceCount}</strong>
        </div>
        <div>
          <span className="badge-label">{t.odds}</span>
          <strong>{raceCard.oddsAvailable ? t.liveOdds : "-"}</strong>
        </div>
      </div>
    </div>
  );
}
