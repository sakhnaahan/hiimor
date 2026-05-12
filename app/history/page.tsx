import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { formatCoins, formatDate } from "@/lib/format";
import { settlePendingHkjcBets } from "@/lib/hkjc-settlement";
import { SettlementPoller } from "@/components/settlement-poller";
import { getTranslations, resultLabel, type Language } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

function resultBadgeClass(result: string) {
  if (result === "WIN") {
    return "green";
  }

  if (result === "LOSS") {
    return "red";
  }

  return "";
}

function getRaceNet(race: { betAmount: number; payout: number; result: string }) {
  if (race.result === "WIN") {
    return race.payout - race.betAmount;
  }

  if (race.result === "LOSS") {
    return -race.betAmount;
  }

  return null;
}

function formatRaceMeta(
  race: { hkjcRaceDate: string | null; hkjcRaceNo: number | null; hkjcRacecourseName: string | null },
  language: Language,
) {
  const t = getTranslations(language);
  return [race.hkjcRaceDate, race.hkjcRaceNo ? `${t.race} ${race.hkjcRaceNo}` : null, race.hkjcRacecourseName]
    .filter(Boolean)
    .join(", ");
}

export default async function HistoryPage() {
  const user = await requireApprovedUser();
  await ensureBootstrapData();
  const language = await getCurrentLanguage();
  const t = getTranslations(language);
  await settlePendingHkjcBets({ userId: user.id });
  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - 90);

  const [races, transactions] = await Promise.all([
    prisma.raceResult.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: historyCutoff },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coinTransaction.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: historyCutoff },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const pendingRaces = races.filter((race) => race.result === "PENDING");

  return (
    <div className="grid">
      <SettlementPoller enabled={races.some((race) => race.result === "PENDING")} />
      {pendingRaces.length ? (
        <section className="panel">
          <h2 className="section-title">{t.pendingBets}</h2>
          <div className="grid">
            {pendingRaces.map((race) => (
              <div className="summary-row pending-bet-card" key={race.id}>
                <div>
                  <span className="badge-label">{t.picked}</span>
                  <strong>{race.selectedHorse}</strong>
                  <span className="muted">{race.betType}</span>
                </div>
                <div>
                  <span className="badge-label">{t.race}</span>
                  <strong>{race.hkjcRaceName ?? `${t.race} ${race.hkjcRaceNo ?? race.id}`}</strong>
                </div>
                <div>
                  <span className="badge-label">{t.bet}</span>
                  <strong>{formatCoins(race.betAmount, language)}</strong>
                </div>
                <div>
                  <span className="badge-label">{t.odds}</span>
                  <strong>{race.multiplierUsed}x</strong>
                </div>
                <span className="badge pending-status">{t.waitingResult}</span>
                <small className="muted">{formatDate(race.createdAt, language)}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="panel">
        <h2 className="section-title">{t.raceHistory}</h2>
        <p className="muted">{t.showingRaces}</p>
        <div className="mobile-record-list">
          {races.map((race) => {
            const net = getRaceNet(race);
            const raceMeta = formatRaceMeta(race, language);

            return (
              <article className="mobile-record-card" key={race.id}>
                <div className="mobile-record-head">
                  <div>
                    <strong>{race.hkjcRaceName ?? `${t.race} ${race.hkjcRaceNo ?? race.id}`}</strong>
                    {raceMeta ? <span>{raceMeta}</span> : null}
                  </div>
                  <span className={`badge ${resultBadgeClass(race.result)}`}>{resultLabel(language, race.result)}</span>
                </div>
                <div className="mobile-record-grid">
                  <div>
                    <span className="badge-label">{t.picked}</span>
                    <strong>{race.selectedHorse}</strong>
                  <span className="muted">{t.no} {race.selectedHorseNo ?? "-"}</span>
                  <span className="muted">{race.betType}</span>
                </div>
                  <div>
                    <span className="badge-label">{t.winner}</span>
                    <strong>{race.winningHorse || t.waitingResult}</strong>
                    <span className="muted">{t.no} {race.winningHorseNo ?? "-"}</span>
                  </div>
                  <div>
                    <span className="badge-label">{t.bet}</span>
                    <strong>{formatCoins(race.betAmount, language)}</strong>
                  </div>
                  <div>
                    <span className="badge-label">{t.multiplier}</span>
                    <strong>{race.multiplierUsed}x</strong>
                  </div>
                  <div>
                    <span className="badge-label">Finish</span>
                    <strong>{race.selectedFinishPlace ?? "-"}</strong>
                  </div>
                  <div>
                    <span className="badge-label">{t.net}</span>
                    {net === null ? (
                      <strong className="muted">{t.waitingResult}</strong>
                    ) : (
                      <strong className={net >= 0 ? "amount-positive" : "amount-negative"}>
                        {net > 0 ? "+" : ""}
                        {formatCoins(net, language)}
                      </strong>
                    )}
                  </div>
                </div>
                <small className="muted">{formatDate(race.createdAt, language)}</small>
              </article>
            );
          })}
        </div>
        <div className="table-wrap">
          <table className="table race-history-table">
            <thead>
              <tr>
                <th>{t.time}</th>
                <th>{t.race}</th>
                <th>{t.picked}</th>
                <th>Bet Type</th>
                <th>{t.winner}</th>
                <th>{t.bet}</th>
                <th>{t.multiplier}</th>
                <th>{t.payout}</th>
                <th>{t.net}</th>
                <th>{t.result}</th>
                <th>{t.settled}</th>
              </tr>
            </thead>
            <tbody>
              {races.map((race) => {
                const net = getRaceNet(race);
                const raceMeta = formatRaceMeta(race, language);

                return (
                  <tr key={race.id}>
                    <td>{formatDate(race.createdAt, language)}</td>
                    <td>
                      <strong>{race.hkjcRaceName ?? `${t.race} ${race.hkjcRaceNo ?? race.id}`}</strong>
                      {raceMeta ? <span className="runner-subtext">{raceMeta}</span> : null}
                    </td>
                    <td>
                      <strong>{race.selectedHorse}</strong>
                      <span className="runner-subtext">{t.no} {race.selectedHorseNo ?? "-"}</span>
                    </td>
                    <td>
                      <strong>{race.betType}</strong>
                      <span className="runner-subtext">Finish {race.selectedFinishPlace ?? "-"}</span>
                    </td>
                    <td>
                      <strong>{race.winningHorse || t.waitingResult}</strong>
                      <span className="runner-subtext">{t.no} {race.winningHorseNo ?? "-"}</span>
                    </td>
                    <td>{formatCoins(race.betAmount, language)}</td>
                    <td>{race.multiplierUsed}x</td>
                    <td>{formatCoins(race.payout, language)}</td>
                    <td>
                      {net === null ? (
                        <span className="muted">{t.waitingResult}</span>
                      ) : (
                        <span className={net >= 0 ? "amount-positive" : "amount-negative"}>
                          {net > 0 ? "+" : ""}
                          {formatCoins(net, language)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${resultBadgeClass(race.result)}`}>{resultLabel(language, race.result)}</span>
                    </td>
                    <td>{race.settledAt ? formatDate(race.settledAt, language) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">{t.transactionHistory}</h2>
        <p className="muted">{t.showingTransactions}</p>
        <div className="mobile-record-list">
          {transactions.map((transaction) => (
            <article className="mobile-record-card" key={transaction.id}>
              <div className="mobile-record-head">
                <div>
                  <strong>{transaction.type}</strong>
                  <span>{formatDate(transaction.createdAt, language)}</span>
                </div>
                <strong className={transaction.amount >= 0 ? "amount-positive" : "amount-negative"}>
                  {transaction.amount > 0 ? "+" : ""}
                  {formatCoins(transaction.amount, language)}
                </strong>
              </div>
              <div className="mobile-record-grid">
                <div>
                  <span className="badge-label">{t.before}</span>
                  <strong>{formatCoins(transaction.balanceBefore, language)}</strong>
                </div>
                <div>
                  <span className="badge-label">{t.after}</span>
                  <strong>{formatCoins(transaction.balanceAfter, language)}</strong>
                </div>
                <div>
                  <span className="badge-label">{t.race}</span>
                  <strong>{transaction.relatedRaceId ?? "-"}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t.time}</th>
                <th>{t.type}</th>
                <th>{t.amount}</th>
                <th>{t.before}</th>
                <th>{t.after}</th>
                <th>{t.race}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDate(transaction.createdAt, language)}</td>
                  <td>{transaction.type}</td>
                  <td>{formatCoins(transaction.amount, language)}</td>
                  <td>{formatCoins(transaction.balanceBefore, language)}</td>
                  <td>{formatCoins(transaction.balanceAfter, language)}</td>
                  <td>{transaction.relatedRaceId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
