import { prisma } from "@/lib/prisma";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { requireAdmin } from "@/lib/auth";
import { formatCoins, formatDate } from "@/lib/format";
import { getTranslations, resultLabel } from "@/lib/i18n";
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

export default async function AdminBetsPage() {
  await requireAdmin();
  await ensureBootstrapData();
  const language = await getCurrentLanguage();
  const t = getTranslations(language);
  const bets = await prisma.raceResult.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="grid">
      <h1 className="page-title">{t.bets}</h1>
      <section className="panel">
        <div className="table-wrap">
          <table className="table admin-bets-table">
            <thead>
              <tr>
                <th>{t.time}</th>
                <th>{t.user}</th>
                <th>{t.race}</th>
                <th>{t.picked}</th>
                <th>Bet Type</th>
                <th>{t.winner}</th>
                <th>{t.bet}</th>
                <th>{t.multiplier}</th>
                <th>{t.payout}</th>
                <th>{t.result}</th>
                <th>{t.settled}</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((bet) => (
                <tr key={bet.id}>
                  <td>{formatDate(bet.createdAt, language)}</td>
                  <td>{bet.user.username}</td>
                  <td>
                    <strong>{bet.hkjcRaceName ?? "-"}</strong>
                    <span className="runner-subtext">
                      {bet.hkjcRaceDate ?? "-"} {t.race} {bet.hkjcRaceNo ?? "-"}
                    </span>
                  </td>
                  <td>
                    <strong>{bet.selectedHorse}</strong>
                    <span className="runner-subtext">{t.no} {bet.selectedHorseNo ?? "-"}</span>
                  </td>
                  <td>
                    <strong>{bet.betType}</strong>
                    <span className="runner-subtext">Finish {bet.selectedFinishPlace ?? "-"}</span>
                  </td>
                  <td>
                    <strong>{bet.winningHorse || t.waitingResult}</strong>
                    <span className="runner-subtext">{t.no} {bet.winningHorseNo ?? "-"}</span>
                  </td>
                  <td>{formatCoins(bet.betAmount, language)}</td>
                  <td>{bet.multiplierUsed}x</td>
                  <td>{formatCoins(bet.payout, language)}</td>
                  <td>
                    <span className={`badge ${resultBadgeClass(bet.result)}`}>{resultLabel(language, bet.result)}</span>
                  </td>
                  <td>{bet.settledAt ? formatDate(bet.settledAt, language) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
