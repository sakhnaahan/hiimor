"use client";

import { useState } from "react";

type HistoryRaceItem = {
  id: number;
  title: string;
  date: string;
  pickedLabel: string;
  pickedValue: string;
  betLabel: string;
  betValue: string;
  resultLabel: string;
  resultTone: string;
  note: string;
};

type HistoryTransactionItem = {
  id: number;
  title: string;
  date: string;
  amount: string;
  amountClassName: string;
  note: string | null;
};

export function HistoryMobileSections({
  raceTitle,
  raceSubtitle,
  raceEmptyMessage,
  transactionTitle,
  transactionSubtitle,
  transactionEmptyMessage,
  resultsTabLabel,
  transactionsTabLabel,
  races,
  transactions,
}: {
  raceTitle: string;
  raceSubtitle: string;
  raceEmptyMessage: string;
  transactionTitle: string;
  transactionSubtitle: string;
  transactionEmptyMessage: string;
  resultsTabLabel: string;
  transactionsTabLabel: string;
  races: HistoryRaceItem[];
  transactions: HistoryTransactionItem[];
}) {
  const [activeTab, setActiveTab] = useState<"results" | "transactions">(
    "results",
  );

  return (
    <>
      <div className="history-mobile-switch" role="tablist">
        <button
          aria-pressed={activeTab === "results"}
          className={activeTab === "results" ? "active" : ""}
          onClick={() => setActiveTab("results")}
          type="button"
        >
          {resultsTabLabel}
        </button>
        <button
          aria-pressed={activeTab === "transactions"}
          className={activeTab === "transactions" ? "active" : ""}
          onClick={() => setActiveTab("transactions")}
          type="button"
        >
          {transactionsTabLabel}
        </button>
      </div>

      <section
        className={`panel history-mobile-panel ${activeTab === "results" ? "is-active" : ""}`}
      >
        <h2 className="section-title">{raceTitle}</h2>
        {races.length ? (
          <div className="history-card-list">
            {races.map((race) => (
              <article className="history-card" key={race.id}>
                <div className="history-card-head">
                  <div>
                    <strong>{race.title}</strong>
                    <span>{race.date}</span>
                  </div>
                  <span className={`badge ${race.resultTone}`}>
                    {race.resultLabel}
                  </span>
                </div>
                <div className="history-card-grid">
                  <div>
                    <span className="badge-label">{race.pickedLabel}</span>
                    <strong>{race.pickedValue}</strong>
                  </div>
                  <div>
                    <span className="badge-label">{race.betLabel}</span>
                    <strong>{race.betValue}</strong>
                  </div>
                </div>
                <p className="history-card-note">{race.note}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="message">{raceEmptyMessage}</p>
        )}
      </section>

      <section
        className={`panel history-mobile-panel ${activeTab === "transactions" ? "is-active" : ""}`}
      >
        <h2 className="section-title">{transactionTitle}</h2>
        {transactions.length ? (
          <div className="history-card-list">
            {transactions.map((transaction) => (
              <article className="history-card" key={transaction.id}>
                <div className="history-card-head">
                  <div>
                    <strong>{transaction.title}</strong>
                    <span>{transaction.date}</span>
                  </div>
                  <strong className={transaction.amountClassName}>
                    {transaction.amount}
                  </strong>
                </div>
                {transaction.note ? (
                  <p className="history-card-note">{transaction.note}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="message">{transactionEmptyMessage}</p>
        )}
      </section>
    </>
  );
}
