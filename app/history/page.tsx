import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { formatCoins, formatDate } from "@/lib/format";
import { settlePendingHkjcBets } from "@/lib/hkjc-settlement";
import { HistoryMobileSections } from "@/components/history-mobile-sections";
import { SettlementPoller } from "@/components/settlement-poller";
import {
  betTypeLabel,
  getTranslations,
  historyResultLabel,
  transactionTypeLabel,
  type Language,
} from "@/lib/i18n";
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

function raceTitle(
  race: { hkjcRaceName: string | null; hkjcRaceNo: number | null; id: number },
  language: Language,
) {
  const t = getTranslations(language);
  return race.hkjcRaceName ?? `${t.race} ${race.hkjcRaceNo ?? race.id}`;
}

function raceExtraNote(
  race: {
    result: string;
    winningHorse: string;
    betType: string;
  },
  language: Language,
) {
  const t = getTranslations(language);

  if (race.result === "PENDING") {
    return t.pendingBetSimple;
  }

  if (race.winningHorse) {
    return `${t.winner}: ${race.winningHorse}`;
  }

  return betTypeLabel(language, race.betType);
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
  const settledRaces = races.filter((race) => race.result !== "PENDING");
  const visibleTransactions = transactions.filter(
    (transaction) => transaction.type !== "RACE_LOSS",
  );
  const historyRaceItems = settledRaces.map((race) => ({
    id: race.id,
    title: raceTitle(race, language),
    date: formatDate(race.createdAt, language),
    pickedLabel: t.picked,
    pickedValue: race.selectedHorse,
    betLabel: t.bet,
    betValue: formatCoins(race.betAmount, language),
    resultLabel: historyResultLabel(language, race.result),
    resultTone: resultBadgeClass(race.result),
    note: raceExtraNote(race, language),
  }));
  const historyTransactionItems = visibleTransactions.map((transaction) => ({
    id: transaction.id,
    title: transactionTypeLabel(language, transaction.type),
    date: formatDate(transaction.createdAt, language),
    amount: `${transaction.amount > 0 ? "+" : ""}${formatCoins(
      transaction.amount,
      language,
    )}`,
    amountClassName:
      transaction.amount >= 0 ? "amount-positive" : "amount-negative",
    note: transaction.relatedRaceId
      ? `${t.relatedRace}: ${t.race} ${transaction.relatedRaceId}`
      : null,
  }));

  return (
    <div className="grid">
      <SettlementPoller enabled={pendingRaces.length > 0} />

      {pendingRaces.length ? (
        <section className="panel">
          <h2 className="section-title">{t.pendingBets}</h2>
          <div className="history-card-list">
            {pendingRaces.map((race) => (
              <article
                className="history-card history-card-pending"
                key={race.id}
              >
                <div className="history-card-head">
                  <div>
                    <strong>{raceTitle(race, language)}</strong>
                    <span>{formatDate(race.createdAt, language)}</span>
                  </div>
                  <span className="badge pending-status">
                    {t.pendingBetSimple}
                  </span>
                </div>
                <div className="history-card-grid">
                  <div>
                    <span className="badge-label">{t.picked}</span>
                    <strong>{race.selectedHorse}</strong>
                  </div>
                  <div>
                    <span className="badge-label">{t.bet}</span>
                    <strong>{formatCoins(race.betAmount, language)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <HistoryMobileSections
        raceEmptyMessage={t.noRaceHistory}
        raceSubtitle={t.showingRaces}
        raceTitle={t.raceHistory}
        races={historyRaceItems}
        resultsTabLabel={t.historyResultsTab}
        transactionEmptyMessage={t.noTransactionHistory}
        transactionSubtitle={t.showingTransactions}
        transactionTitle={t.transactionHistory}
        transactions={historyTransactionItems}
        transactionsTabLabel={t.historyTransactionsTab}
      />
    </div>
  );
}
