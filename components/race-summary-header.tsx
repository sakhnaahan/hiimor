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
  const mobileDetailLines = [
    [raceCard.meetingDate, raceCard.startTime].filter(Boolean).join(", "),
    [raceCard.raceClass, raceCard.distance, raceCard.surface]
      .filter(Boolean)
      .join(", "),
    [raceCard.course ? `"${raceCard.course}" COURSE` : null, raceCard.going]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  return (
    <div className="race-summary-wrap">
      <div className="race-app-hero">
        <div>
          <span className="race-app-mark">{t.brand}</span>
          <strong>
            {t.race} {raceCard.raceNo}
          </strong>
        </div>
        {/* <div className="race-app-actions" aria-label="Race account shortcuts">
          <span>{pendingRaceCount}</span>
          <span>$</span>
          <span>@</span>
        </div> */}
      </div>

      <div className="race-notice-strip">
        <span>!</span>
        <strong>
          {raceCard.oddsAvailable ? t.liveOdds : t.racecardUnavailable}
        </strong>
        <a
          href={"https://www.youtube.com/@HKJC/streams"}
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
        {/* <div className="race-mobile-wager">
            <strong>Win/Place</strong>
            <span aria-hidden="true">v</span>
          </div> */}
      </div>
    </div>
  );
}
