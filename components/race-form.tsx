"use client";

import { useState } from "react";
import { runRaceAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { formatCoins } from "@/lib/format";
import { getTranslations, interpolate, type Language } from "@/lib/i18n";
import type { HkjcRaceCard } from "@/lib/hkjc-racecard";
import {
  calculatePotentialPayoutForRunner,
  canSubmitStake,
  findSelectedRunner,
  getRunnerLockedWinOdds,
  getQuickStakeValue,
  type QuickStakeAction,
} from "@/lib/race-betting-ui";

function RunnerFact({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <span className="runner-fact">
      <span className="runner-fact-label">{label}: </span>
      <strong>{value}</strong>
    </span>
  );
}

export function RaceForm({
  balance,
  raceCard,
  language,
}: {
  balance: number;
  raceCard: HkjcRaceCard;
  language: Language;
}) {
  const t = getTranslations(language);
  const [selectedHorseNo, setSelectedHorseNo] = useState(raceCard.runners[0]?.horseNo ?? "");
  const [expandedHorseNo, setExpandedHorseNo] = useState<string | null>(null);
  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [stake, setStake] = useState("");
  const selectedRunner = findSelectedRunner(raceCard.runners, selectedHorseNo);
  const lockedWinOdds = getRunnerLockedWinOdds(selectedRunner);
  const potentialPayout = calculatePotentialPayoutForRunner(stake, selectedRunner);
  const canPlaceBet = Boolean(selectedRunner) && lockedWinOdds !== null && canSubmitStake(stake, balance);

  function applyQuickStake(action: QuickStakeAction) {
    setStake(getQuickStakeValue(action, balance));
  }

  function confirmBet(event: React.FormEvent<HTMLFormElement>) {
    if (!selectedRunner || !canPlaceBet) {
      event.preventDefault();
      return;
    }

    const confirmed = window.confirm(
      interpolate(t.placeBetConfirm, {
        amount: formatCoins(Number(stake), language),
        horseNo: selectedRunner.horseNo,
        horseName: selectedRunner.name,
      }),
    );
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <ActionForm action={runRaceAction} className="form race-form" language={language} onSubmit={confirmBet}>
      {({ pending, message }) => (
        <>
          <input name="raceDate" type="hidden" value={raceCard.raceDate} />
          <input name="racecourseCode" type="hidden" value={raceCard.racecourseCode} />
          <input name="raceNo" type="hidden" value={raceCard.raceNo} />
          <input name="quotedWinOdds" type="hidden" value={selectedRunner?.winOdds ?? ""} />

          <div className="race-betting-layout">
            <div className="horse-grid race-runner-grid">
              {raceCard.runners.map((runner) => {
                const expanded = expandedHorseNo === runner.horseNo;
                const extraStats = [
                  { label: t.gear, value: runner.gear },
                  { label: t.last6, value: runner.last6Runs },
                  { label: t.horseWeight, value: runner.horseWeight },
                  { label: t.rating, value: runner.rating },
                  { label: t.bestTime, value: runner.bestTime },
                  { label: t.daysSinceLastRun, value: runner.daysSinceLastRun },
                  { label: t.overWeight, value: runner.overWeight },
                ];
                const hasExtraStats = extraStats.some((stat) => stat.value);
                const statsId = `runner-stats-${runner.horseNo}`;

                return (
                  <div className="horse-option" key={`${runner.horseNo}-${runner.brandNo}`}>
                    <label className="horse-select">
                      <input
                        checked={selectedHorseNo === runner.horseNo}
                        name="selectedHorseNo"
                        onChange={() => setSelectedHorseNo(runner.horseNo)}
                        type="radio"
                        value={runner.horseNo}
                      />
                      <span className="horse-card runner-card">
                        <span className="runner-title-row">
                          <span className="runner-number">No. {runner.horseNo}</span>
                          {runner.hotFavourite ? <span className="runner-hot">{t.hotFavourite}</span> : null}
                          {runner.oddsAvailable && runner.winOdds ? (
                            <span className="runner-odds-pill">{t.odds} {runner.winOdds}</span>
                          ) : (
                            <span className="runner-odds-pill unavailable">{t.odds} -</span>
                          )}
                        </span>
                        <strong>{runner.name}</strong>
                        {runner.oddsAvailable && runner.marketChance ? (
                          <span className="runner-market">
                            {t.marketChance} {runner.marketChance}% {runner.winOdds ? `(${t.odds} ${runner.winOdds})` : ""}
                          </span>
                        ) : null}
                        <span className="runner-primary-facts">
                          <RunnerFact label={t.jockey} value={runner.jockey} />
                          <RunnerFact label={t.draw} value={runner.draw} />
                        </span>
                      </span>
                    </label>
                    <button
                      aria-controls={statsId}
                      aria-expanded={expanded}
                      className="runner-stats-toggle"
                      onClick={() => setExpandedHorseNo(expanded ? null : runner.horseNo)}
                      type="button"
                    >
                      {expanded ? t.hideStats : t.moreStats}
                    </button>
                    {expanded ? (
                      <div className="runner-secondary-facts" id={statsId}>
                        {hasExtraStats ? (
                          extraStats.map((stat) => <RunnerFact key={stat.label} label={stat.label} value={stat.value} />)
                        ) : (
                          <span className="muted">{t.noExtraStats}</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <aside className={`bet-slip ${betSlipOpen ? "is-expanded" : "is-collapsed"}`}>
              <div className="bet-slip-mobile-summary">
                <button
                  aria-expanded={betSlipOpen}
                  className="bet-slip-drawer-toggle"
                  onClick={() => setBetSlipOpen((open) => !open)}
                  type="button"
                >
                  <span>{t.placeBet}</span>
                  <strong>{selectedRunner ? `${t.no} ${selectedRunner.horseNo}` : "-"}</strong>
                </button>
                <div>
                  <span className="badge-label">{t.ifYouWin}</span>
                  <strong>{formatCoins(potentialPayout, language)}</strong>
                </div>
              </div>
              <div className="bet-slip-body">
                <div>
                  <span className="badge-label">{t.youPicked}</span>
                  {selectedRunner ? (
                    <>
                      <strong>{selectedRunner.name}</strong>
                      <span className="muted">{t.no} {selectedRunner.horseNo}</span>
                    </>
                  ) : (
                    <strong>-</strong>
                  )}
                </div>
                <div className="bet-slip-summary">
                  <div>
                    <span className="badge-label">{t.balance}</span>
                    <strong>{formatCoins(balance, language)}</strong>
                  </div>
                  <div>
                    <span className="badge-label">{t.odds}</span>
                    <strong>{lockedWinOdds === null ? "-" : `${lockedWinOdds}x`}</strong>
                  </div>
                  <div>
                    <span className="badge-label">{t.marketChance}</span>
                    <strong>{lockedWinOdds !== null && selectedRunner?.marketChance ? `${selectedRunner.marketChance}%` : "-"}</strong>
                  </div>
                  <div>
                    <span className="badge-label">{t.ifYouWin}</span>
                    <strong>{formatCoins(potentialPayout, language)}</strong>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="betAmount">{t.betAmount}</label>
                  <input
                    className="input"
                    id="betAmount"
                    inputMode="numeric"
                    max={Math.max(balance, 1)}
                    min="1"
                    name="betAmount"
                    onChange={(event) => setStake(event.target.value)}
                    placeholder={t.enterBetAmount}
                    required
                    type="number"
                    value={stake}
                  />
                </div>
                <div className="quick-stakes">
                  <button onClick={() => applyQuickStake("max")} type="button">
                    {t.max}
                  </button>
                  <button onClick={() => applyQuickStake("clear")} type="button">
                    {t.clear}
                  </button>
                </div>
              </div>
              <button className="button bet-slip-submit" disabled={pending || !canPlaceBet} type="submit">
                {pending ? t.placing : t.placeBet}
              </button>
              {message}
            </aside>
          </div>
        </>
      )}
    </ActionForm>
  );
}
