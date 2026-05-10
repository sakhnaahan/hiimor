import type { HkjcRaceCardResult } from "@/lib/hkjc-racecard";
import { getTranslations, type Language } from "@/lib/i18n";

export function HkjcRaceCardPanel({ result, language = "mn" }: { result: HkjcRaceCardResult; language?: Language }) {
  const t = getTranslations(language);

  if (!result.ok) {
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">HKJC {t.race}</h2>
            <p className="muted">{t.racecardUnavailable}</p>
          </div>
        </div>
        <p className="message error">{result.message}</p>
      </section>
    );
  }

  const raceCard = result.raceCard;
  const raceDetails = [raceCard.surface, raceCard.course, raceCard.distance, raceCard.going]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2 className="section-title">HKJC {t.race}</h2>
          <p className="muted">
            {t.race} {raceCard.raceNo} - {raceCard.raceName}
          </p>
        </div>
      </div>

      <div className="racecard-meta">
        <div>
          <span className="meta-label">{t.meeting}</span>
          <strong>{raceCard.meetingDate}</strong>
          <span>{raceCard.racecourse}</span>
        </div>
        <div>
          <span className="meta-label">{t.start}</span>
          <strong>{raceCard.startTime}</strong>
          <span>{raceDetails}</span>
        </div>
        <div>
          <span className="meta-label">{t.prize}</span>
          <strong>{raceCard.prizeMoney || t.tbc}</strong>
          <span>{raceCard.raceClass || t.tbc}</span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table racecard-table">
          <thead>
            <tr>
              <th>{t.no}</th>
              <th>{t.horse}</th>
              <th>{t.jockey}</th>
              <th>{t.draw}</th>
              <th>{t.trainer}</th>
              <th>{t.weight}</th>
              <th>{t.gear}</th>
            </tr>
          </thead>
          <tbody>
            {raceCard.runners.map((runner) => (
              <tr key={`${runner.horseNo}-${runner.brandNo}`}>
                <td>{runner.horseNo}</td>
                <td>
                  <strong>{runner.name}</strong>
                  <span className="runner-subtext">{runner.brandNo}</span>
                </td>
                <td>{runner.jockey}</td>
                <td>{runner.draw}</td>
                <td>{runner.trainer}</td>
                <td>{runner.weight}</td>
                <td>{runner.gear || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
