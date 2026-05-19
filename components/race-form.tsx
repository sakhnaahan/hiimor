"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { runRaceBasketAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import {
  formatCoins,
  formatRunnerHorseWeight,
  formatRunnerLast6Runs,
} from "@/lib/format";
import { getTranslations, interpolate, type Language } from "@/lib/i18n";
import type { HkjcRaceCard, HkjcRunner } from "@/lib/hkjc-racecard";
import {
  buildQuinellaOddsMatrix,
  buildQuinellaQuotedOddsMap,
  calculatePotentialPayoutForRunner,
  calculateQuinellaPayout,
  calculateWinPlaceComboPayout,
  canOfferPlaceBet,
  createEmptyQuinellaDraft,
  getBasketTotals,
  getBetLineCount,
  getBetLineTypes,
  getComboPendingDecision,
  getMobileBetModeTransition,
  getQuinellaPendingDecision,
  getSingleBetTapDecision,
  getRunnerLockedPlaceOdds,
  getRunnerLockedWinOdds,
  parseStakeInput,
  selectQuinellaBanker,
  toggleQuinellaLeg,
  type QuinellaInspectedPair,
  type MobileBetMode,
  type QuinellaDraft,
  type RaceBetType,
} from "@/lib/race-betting-ui";
import { getRunnerStatSignals } from "@/lib/hkjc-runner-stats";
import { MIN_BET_AMOUNT } from "@/lib/rules";
import { FaChevronDown, FaChevronUp, FaCoins } from "react-icons/fa6";
import { useRouter } from "next/navigation";

const DEFAULT_UNIT_BET = String(MIN_BET_AMOUNT);

type BasketItem = {
  id: string;
  horseNo: string;
  horseName: string;
  placeHorseNo?: string;
  placeHorseName?: string;
  selectedLegHorseNos?: string[];
  quotedQuinellaOdds?: Record<string, string>;
  betType: RaceBetType;
  quotedWinOdds: string;
  quotedPlaceOdds: string;
  unitBetAmount: string;
};

type SelectionMode = "single" | "combo";
type BetSlipTab = "quick";
type PendingBetSelection = BasketItem & {
  raceNo: number;
};

function RunnerStatTile({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <div className="runner-stat-tile">
      <span className="runner-stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RunnerLast6Panel({ label, value }: { label: string; value?: string }) {
  const finishes = formatRunnerLast6Runs(value);
  if (finishes.length === 0) {
    return null;
  }

  return (
    <div className="runner-detail-panel runner-detail-last6-panel">
      <div className="runner-detail-panel-header">
        <span className="runner-detail-panel-title">{label}</span>
      </div>
      <div className="runner-last6-list">
        {finishes.map((finish, index) => (
          <span
            className={`runner-last6-chip ${finish.isHighlighted ? "is-highlighted" : ""}`}
            key={`${finish.value}-${index}`}
          >
            {finish.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function SilkPlaceholder({ horseNo }: { horseNo: string }) {
  const palette = [
    ["#f7c325", "#0b3b78"],
    ["#111827", "#f7c325"],
    ["#e5e7eb", "#ef7aa7"],
    ["#28b67a", "#f7c325"],
    ["#0b3b78", "#dc2626"],
    ["#f97316", "#16a34a"],
  ];
  const index = Math.max(0, Number.parseInt(horseNo, 10) - 1) % palette.length;
  const [primary, accent] = palette[index];

  return (
    <span
      className="silk-placeholder"
      style={
        { "--silk-primary": primary, "--silk-accent": accent } as CSSProperties
      }
    >
      <span className="silk-placeholder-head">
        <span className="silk-placeholder-cap" />
      </span>
      <span className="silk-placeholder-sleeve silk-placeholder-sleeve-left" />
      <span className="silk-placeholder-sleeve silk-placeholder-sleeve-right" />
      <span className="silk-placeholder-torso">
        <span className="silk-placeholder-stripe" />
      </span>
    </span>
  );
}

function getBasketItemId(
  horseNo: string,
  betType: RaceBetType,
  placeHorseNo = "",
) {
  return `${horseNo}:${betType}:${placeHorseNo}`;
}

function getBetTypeLabel(betType: RaceBetType) {
  if (betType === "WIN") {
    return "Win";
  }

  if (betType === "PLACE") {
    return "Place";
  }

  if (betType === "WIN_PLACE_COMBO") {
    return "Win + Place Combo";
  }

  if (betType === "QUINELLA") {
    return "Quinella";
  }

  return "Win - Place";
}

function getBetSlipBetTypeLabel(
  betType: RaceBetType,
  language: Language,
  t: ReturnType<typeof getTranslations>,
) {
  if (language === "mn") {
    if (betType === "WIN") {
      return "1";
    }

    if (betType === "PLACE") {
      return "2";
    }

    if (betType === "WIN_PLACE") {
      return t.winPlace;
    }

    if (betType === "WIN_PLACE_COMBO") {
      return t.comboWp;
    }

    if (betType === "QUINELLA") {
      return t.quinella;
    }
  }

  return getBetTypeLabel(betType);
}

function getRunnerBetButtonLabels(language: Language) {
  if (language === "mn") {
    return {
      win: "1",
      place: "2",
      winPlace: "1&2",
    };
  }

  return {
    win: "W",
    place: "P",
    winPlace: "W&P",
  };
}

function getRunnerByHorseNo(runners: readonly HkjcRunner[], horseNo: string) {
  return runners.find((runner) => runner.horseNo === horseNo) ?? null;
}

export function RaceForm({
  balance,
  raceCard,
  language,
  mobileBetMode,
  onSelectBetMode,
}: {
  balance: number;
  raceCard: HkjcRaceCard;
  language: Language;
  mobileBetMode: MobileBetMode;
  onSelectBetMode: (mode: MobileBetMode) => void;
}) {
  const t = getTranslations(language);
  const [expandedHorseNos, setExpandedHorseNos] = useState<string[]>([]);
  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [betSlipTab, setBetSlipTab] = useState<BetSlipTab>("quick");
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
  const [pendingBet, setPendingBet] = useState<PendingBetSelection | null>(
    null,
  );
  const [comboWinHorseNo, setComboWinHorseNo] = useState<string | null>(null);
  const [comboPlaceHorseNo, setComboPlaceHorseNo] = useState<string | null>(
    null,
  );
  const [quinellaDraft, setQuinellaDraft] = useState<QuinellaDraft>(
    createEmptyQuinellaDraft(),
  );
  const [quinellaOddsOpen, setQuinellaOddsOpen] = useState(false);
  const [inspectedQuinellaPair, setInspectedQuinellaPair] =
    useState<QuinellaInspectedPair | null>(null);
  const previousMobileBetModeRef = useRef(mobileBetMode);
  const placeAvailable = canOfferPlaceBet(raceCard.runners);
  const basketTotals = getBasketTotals(basketItems);
  const router = useRouter();
  const visibleBetSlipItems = basketItems;
  const runnerBetButtonLabels = getRunnerBetButtonLabels(language);
  const selectionMode: SelectionMode =
    mobileBetMode === "combo-wp" ? "combo" : "single";
  const quinellaMode = mobileBetMode === "quinella";
  const quinellaAvailable = raceCard.quinellaOddsAvailable;
  const quinellaUnavailableMessage =
    "quinellaOddsUnavailable" in t
      ? t.quinellaOddsUnavailable
      : "Мэдээлэл түр байхгүй байна.";
  const basketPayload = useMemo(
    () =>
      JSON.stringify(
        basketItems.map((item) => ({
          selectedHorseNo: item.horseNo,
          selectedPlaceHorseNo: item.placeHorseNo ?? "",
          selectedLegHorseNos: item.selectedLegHorseNos ?? [],
          betType: item.betType,
          quotedWinOdds: item.quotedWinOdds,
          quotedPlaceOdds: item.quotedPlaceOdds,
          quotedQuinellaOdds: item.quotedQuinellaOdds ?? {},
          unitBetAmount: item.unitBetAmount,
        })),
      ),
    [basketItems],
  );
  const potentialPayout = basketItems.reduce((total, item) => {
    const runner = getRunnerByHorseNo(raceCard.runners, item.horseNo);
    if (item.betType === "QUINELLA") {
      return (
        total +
        calculateQuinellaPayout(
          item.unitBetAmount,
          raceCard.quinellaOdds,
          item.horseNo,
          item.selectedLegHorseNos ?? [],
        )
      );
    }

    if (item.betType === "WIN_PLACE_COMBO") {
      return (
        total +
        calculateWinPlaceComboPayout(
          item.unitBetAmount,
          runner,
          item.placeHorseNo
            ? getRunnerByHorseNo(raceCard.runners, item.placeHorseNo)
            : null,
        )
      );
    }

    return (
      total +
      calculatePotentialPayoutForRunner(
        item.unitBetAmount,
        runner,
        item.betType,
      )
    );
  }, 0);
  const canSubmitBasket =
    basketItems.length > 0 &&
    basketTotals.invalidStakeCount === 0 &&
    basketTotals.totalStake <= balance &&
    basketItems.every((item) => {
      const runner = getRunnerByHorseNo(raceCard.runners, item.horseNo);
      if (!runner) {
        return false;
      }

      if (item.betType === "QUINELLA") {
        return (
          Boolean(item.selectedLegHorseNos?.length) &&
          (item.selectedLegHorseNos ?? []).every(
            (legHorseNo) =>
              legHorseNo !== runner.horseNo &&
              Boolean(
                raceCard.quinellaOdds.find(
                  (entry) =>
                    [entry.horseNoA, entry.horseNoB].includes(runner.horseNo) &&
                    [entry.horseNoA, entry.horseNoB].includes(legHorseNo),
                ),
              ),
          )
        );
      }

      if (item.betType === "WIN_PLACE_COMBO") {
        const placeRunner = item.placeHorseNo
          ? getRunnerByHorseNo(raceCard.runners, item.placeHorseNo)
          : null;
        return (
          runner.horseNo !== placeRunner?.horseNo &&
          getRunnerLockedWinOdds(runner) !== null &&
          getRunnerLockedPlaceOdds(placeRunner) !== null
        );
      }

      return getBetLineTypes(item.betType).every((lineType) =>
        lineType === "WIN"
          ? getRunnerLockedWinOdds(runner) !== null
          : getRunnerLockedPlaceOdds(runner) !== null,
      );
    });
  const quinellaMatrix = useMemo(
    () =>
      buildQuinellaOddsMatrix(
        raceCard.runners,
        raceCard.quinellaOdds,
        quinellaDraft.bankerHorseNo,
        quinellaDraft.legHorseNos,
        inspectedQuinellaPair,
      ),
    [
      inspectedQuinellaPair,
      quinellaDraft.bankerHorseNo,
      quinellaDraft.legHorseNos,
      raceCard.quinellaOdds,
      raceCard.runners,
    ],
  );

  useEffect(() => {
    function syncBetSlipToHash() {
      setBetSlipOpen(window.location.hash === "#betslip");
    }

    function openBetSlip() {
      setBetSlipOpen(true);
      setBetSlipTab("quick");
      if (window.location.hash !== "#betslip") {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#betslip`,
        );
      }
    }

    syncBetSlipToHash();
    window.addEventListener("hashchange", syncBetSlipToHash);
    window.addEventListener("open-betslip", openBetSlip);
    return () => {
      window.removeEventListener("hashchange", syncBetSlipToHash);
      window.removeEventListener("open-betslip", openBetSlip);
    };
  }, []);

  useEffect(() => {
    const previousMobileBetMode = previousMobileBetModeRef.current;
    const transition = getMobileBetModeTransition(
      previousMobileBetMode,
      mobileBetMode,
    );

    if (transition.clearComboDraft) {
      setComboWinHorseNo(null);
      setComboPlaceHorseNo(null);
    }

    if (transition.clearPendingBet === "all") {
      setPendingBet(null);
    } else if (transition.clearPendingBet === "combo-only") {
      setPendingBet((currentPendingBet) =>
        currentPendingBet?.betType === "WIN_PLACE_COMBO"
          ? null
          : currentPendingBet,
      );
    }

    previousMobileBetModeRef.current = mobileBetMode;
    if (mobileBetMode !== "quinella") {
      setQuinellaDraft(createEmptyQuinellaDraft());
      setQuinellaOddsOpen(false);
      setInspectedQuinellaPair(null);
      setPendingBet((currentPendingBet) =>
        currentPendingBet?.betType === "QUINELLA" ? null : currentPendingBet,
      );
    }
  }, [mobileBetMode]);

  useEffect(() => {
    if (quinellaAvailable) {
      return;
    }

    setQuinellaDraft(createEmptyQuinellaDraft());
    setInspectedQuinellaPair(null);
    setPendingBet((currentPendingBet) =>
      currentPendingBet?.betType === "QUINELLA" ? null : currentPendingBet,
    );
  }, [quinellaAvailable]);

  useEffect(() => {
    if (mobileBetMode === "quinella" && quinellaOddsOpen && quinellaAvailable) {
      return;
    }

    setInspectedQuinellaPair(null);
  }, [mobileBetMode, quinellaAvailable, quinellaOddsOpen]);

  function openBetSlipPanel() {
    setBetSlipOpen(true);
    setBetSlipTab("quick");
    if (window.location.hash !== "#betslip") {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#betslip`,
      );
      window.dispatchEvent(new Event("hashchange"));
    }
  }

  function closeBetSlipPanel() {
    setBetSlipOpen(false);
    if (window.location.hash === "#betslip") {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      window.dispatchEvent(new Event("hashchange"));
    }
  }

  function toggleBetSlip() {
    const nextOpen = !betSlipOpen;

    if (nextOpen) {
      openBetSlipPanel();
      return;
    }

    closeBetSlipPanel();
  }

  function toggleExpandedHorse(horseNo: string) {
    setExpandedHorseNos((currentHorseNos) =>
      currentHorseNos.includes(horseNo)
        ? currentHorseNos.filter((currentHorseNo) => currentHorseNo !== horseNo)
        : [...currentHorseNos, horseNo],
    );
  }

  function toggleBasketItem(item: BasketItem) {
    setBasketItems((items) => {
      if (items.some((existingItem) => existingItem.id === item.id)) {
        return items.filter((existingItem) => existingItem.id !== item.id);
      }

      return [...items, item];
    });
    setPendingBet(null);
    toggleBetSlip();
  }

  function addBasketItem(runner: HkjcRunner, betType: RaceBetType) {
    const id = getBasketItemId(runner.horseNo, betType);
    const tapDecision = getSingleBetTapDecision(
      pendingBet?.id,
      basketItems.map((item) => item.id),
      id,
    );

    if (tapDecision === "clear-pending") {
      setPendingBet(null);
      return;
    }

    if (tapDecision === "ignore-basket-item") {
      return;
    }

    setPendingBet({
      id,
      horseNo: runner.horseNo,
      horseName: runner.name,
      betType,
      quotedWinOdds: runner.winOdds ?? "",
      quotedPlaceOdds: runner.placeOdds ?? "",
      unitBetAmount: DEFAULT_UNIT_BET,
      raceNo: raceCard.raceNo,
    });
  }

  function syncComboPendingBet(
    nextWinHorseNo: string | null,
    nextPlaceHorseNo: string | null,
  ) {
    const pendingDecision = getComboPendingDecision(
      pendingBet?.betType,
      nextWinHorseNo,
      nextPlaceHorseNo,
    );

    if (pendingDecision === "clear-pending") {
      setPendingBet(null);
      return;
    }

    if (pendingDecision === "keep-pending") {
      return;
    }

    const winRunner = nextWinHorseNo
      ? getRunnerByHorseNo(raceCard.runners, nextWinHorseNo)
      : null;
    const placeRunner = nextPlaceHorseNo
      ? getRunnerByHorseNo(raceCard.runners, nextPlaceHorseNo)
      : null;
    if (!winRunner || !placeRunner || winRunner.horseNo === placeRunner.horseNo) {
      setPendingBet((currentPendingBet) =>
        currentPendingBet?.betType === "WIN_PLACE_COMBO"
          ? null
          : currentPendingBet,
      );
      return;
    }

    const id = getBasketItemId(
      winRunner.horseNo,
      "WIN_PLACE_COMBO",
      placeRunner.horseNo,
    );
    setPendingBet({
      id,
      horseNo: winRunner.horseNo,
      horseName: winRunner.name,
      placeHorseNo: placeRunner.horseNo,
      placeHorseName: placeRunner.name,
      betType: "WIN_PLACE_COMBO",
      quotedWinOdds: winRunner.winOdds ?? "",
      quotedPlaceOdds: placeRunner.placeOdds ?? "",
      unitBetAmount: DEFAULT_UNIT_BET,
      raceNo: raceCard.raceNo,
    });
  }

  function syncQuinellaPendingBet(nextDraft: QuinellaDraft) {
    const quotedOdds = buildQuinellaQuotedOddsMap(
      raceCard.quinellaOdds,
      nextDraft.bankerHorseNo,
      nextDraft.legHorseNos,
    );
    const pendingDecision = getQuinellaPendingDecision(
      pendingBet?.betType,
      nextDraft,
      Boolean(quotedOdds),
    );

    if (pendingDecision === "clear-pending") {
      setPendingBet((currentPendingBet) =>
        currentPendingBet?.betType === "QUINELLA" ? null : currentPendingBet,
      );
      return;
    }

    if (pendingDecision === "keep-pending" || !nextDraft.bankerHorseNo || !quotedOdds) {
      return;
    }

    const bankerRunner = getRunnerByHorseNo(raceCard.runners, nextDraft.bankerHorseNo);
    if (!bankerRunner) {
      setPendingBet((currentPendingBet) =>
        currentPendingBet?.betType === "QUINELLA" ? null : currentPendingBet,
      );
      return;
    }

    const legRunners = nextDraft.legHorseNos
      .map((legHorseNo) => getRunnerByHorseNo(raceCard.runners, legHorseNo))
      .filter((runner): runner is HkjcRunner => runner !== null);
    if (legRunners.length !== nextDraft.legHorseNos.length) {
      setPendingBet((currentPendingBet) =>
        currentPendingBet?.betType === "QUINELLA" ? null : currentPendingBet,
      );
      return;
    }

    setPendingBet({
      id: getBasketItemId(
        bankerRunner.horseNo,
        "QUINELLA",
        nextDraft.legHorseNos.join("|"),
      ),
      horseNo: bankerRunner.horseNo,
      horseName: bankerRunner.name,
      selectedLegHorseNos: nextDraft.legHorseNos,
      quotedQuinellaOdds: quotedOdds,
      betType: "QUINELLA",
      quotedWinOdds: "",
      quotedPlaceOdds: "",
      unitBetAmount: DEFAULT_UNIT_BET,
      raceNo: raceCard.raceNo,
    });
  }

  function selectComboWin(runner: HkjcRunner) {
    const nextPlaceHorseNo =
      comboPlaceHorseNo === runner.horseNo ? null : comboPlaceHorseNo;
    const nextWinHorseNo = runner.horseNo;
    setComboWinHorseNo(nextWinHorseNo);
    setComboPlaceHorseNo(nextPlaceHorseNo);
    syncComboPendingBet(nextWinHorseNo, nextPlaceHorseNo);
  }

  function handleSelectQuinellaBanker(runner: HkjcRunner) {
    if (!quinellaAvailable) {
      return;
    }

    const nextDraft = selectQuinellaBanker(quinellaDraft, runner.horseNo);
    setQuinellaDraft(nextDraft);
    syncQuinellaPendingBet(nextDraft);
  }

  function handleToggleQuinellaLeg(runner: HkjcRunner) {
    if (!quinellaAvailable) {
      return;
    }

    const nextDraft = toggleQuinellaLeg(quinellaDraft, runner.horseNo);
    setQuinellaDraft(nextDraft);
    syncQuinellaPendingBet(nextDraft);
  }

  function inspectQuinellaPair(rowHorseNo: string, columnHorseNo: string) {
    setInspectedQuinellaPair({
      rowHorseNo,
      columnHorseNo,
    });
  }

  function selectComboPlace(runner: HkjcRunner) {
    const nextWinHorseNo =
      comboWinHorseNo === runner.horseNo ? null : comboWinHorseNo;
    const nextPlaceHorseNo = runner.horseNo;
    setComboWinHorseNo(nextWinHorseNo);
    setComboPlaceHorseNo(nextPlaceHorseNo);
    syncComboPendingBet(nextWinHorseNo, nextPlaceHorseNo);
  }

  function removeBasketItem(id: string) {
    setBasketItems((items) => items.filter((item) => item.id !== id));
  }

  function clearBasketItems() {
    setBasketItems([]);
  }

  function clearQuinellaDraftState() {
    const clearedDraft = createEmptyQuinellaDraft();
    setQuinellaDraft(clearedDraft);
    syncQuinellaPendingBet(clearedDraft);
  }

  function updateBasketStake(id: string, unitBetAmount: string) {
    setBasketItems((items) =>
      items.map((item) => (item.id === id ? { ...item, unitBetAmount } : item)),
    );
  }

  function confirmBasket(event: React.FormEvent<HTMLFormElement>) {
    if (!canSubmitBasket) {
      event.preventDefault();
      return;
    }

    const confirmed = window.confirm(
      interpolate(t.placeBasketConfirm, {
        amount: formatCoins(basketTotals.totalStake, language),
        count: basketTotals.lineCount,
      }),
    );
    if (!confirmed) {
      event.preventDefault();
    }
    setBasketItems([]);
    router.push("/history");
  }

  return (
    <ActionForm
      action={runRaceBasketAction}
      className="form race-form"
      language={language}
      onSubmit={confirmBasket}
    >
      {({ pending, message }) => (
        <>
          <input name="raceDate" type="hidden" value={raceCard.raceDate} />
          <input
            name="racecourseCode"
            type="hidden"
            value={raceCard.racecourseCode}
          />
          <input name="raceNo" type="hidden" value={raceCard.raceNo} />
          <input name="basketItems" type="hidden" value={basketPayload} />

          <div className="race-betting-layout" id="race-info">
            <div className="runner-list">
              <div
                className={`combo-mode-bar ${selectionMode === "combo" ? "is-combo-active" : ""}`}
              >
                <div className="combo-mode-switch" aria-label="Bet mode">
                  <button
                    className={selectionMode === "single" ? "active" : ""}
                    onClick={() => onSelectBetMode("win-place")}
                    type="button"
                  >
                    {t.winPlace}
                  </button>
                  <button
                    className={selectionMode === "combo" ? "active" : ""}
                    onClick={() => onSelectBetMode("combo-wp")}
                    type="button"
                  >
                    {t.comboWp}
                  </button>
                  <button
                    className={mobileBetMode === "quinella" ? "active" : ""}
                    onClick={() => onSelectBetMode("quinella")}
                    type="button"
                  >
                    {t.quinella}
                  </button>
                </div>
              </div>
              {quinellaMode ? (
                <div className="quinella-mode-shell">
                  <div className="quinella-odds-panel">
                    <button
                      aria-expanded={quinellaOddsOpen}
                      className="quinella-odds-toggle"
                      onClick={() => setQuinellaOddsOpen((open) => !open)}
                      type="button"
                    >
                      <strong>Odds</strong>
                      <span aria-hidden="true">
                        {quinellaOddsOpen ? <FaChevronUp /> : <FaChevronDown />}
                      </span>
                    </button>
                    {quinellaOddsOpen ? (
                      <div className="quinella-matrix-wrap">
                        <table className="quinella-matrix">
                          <thead>
                            <tr>
                              <th>QIN</th>
                              {quinellaMatrix.horseNos.map((horseNo) => (
                                <th
                                  className={[
                                    quinellaDraft.bankerHorseNo === horseNo
                                      ? "is-banker"
                                      : quinellaDraft.legHorseNos.includes(
                                            horseNo,
                                          )
                                        ? "is-leg"
                                        : "",
                                    quinellaMatrix.inspectedColumnHorseNo ===
                                    horseNo
                                      ? "is-inspected-horse"
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  key={horseNo}
                                >
                                  {horseNo}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {quinellaMatrix.rows.map((row) => (
                              <tr key={row.horseNo}>
                                <th
                                  className={[
                                    quinellaDraft.bankerHorseNo === row.horseNo
                                      ? "is-banker"
                                      : quinellaDraft.legHorseNos.includes(
                                            row.horseNo,
                                          )
                                        ? "is-leg"
                                        : "",
                                    row.isInspected
                                      ? "is-inspected-horse"
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  {row.horseNo}
                                </th>
                                {row.cells.map((cell) => (
                                  <td
                                    className={[
                                      cell.isDiagonal ? "is-diagonal" : "",
                                      cell.isHighlighted ? "is-highlighted" : "",
                                      cell.isIntersection
                                        ? "is-intersection"
                                        : "",
                                      cell.isInspected ? "is-inspected" : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    key={`${row.horseNo}-${cell.horseNo}`}
                                  >
                                    {cell.displayOdds ? (
                                      <button
                                        className="quinella-matrix-cell-button"
                                        onClick={() =>
                                          inspectQuinellaPair(
                                            row.horseNo,
                                            cell.horseNo,
                                          )
                                        }
                                        type="button"
                                      >
                                        {cell.displayOdds}
                                      </button>
                                    ) : !cell.isDiagonal ? (
                                      <span className="quinella-matrix-placeholder">---</span>
                                    ) : (
                                      ""
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    {!quinellaAvailable ? (
                      <p className="message quinella-mode-note">
                        {quinellaUnavailableMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {raceCard.runners.map((runner) => {
                const expanded = expandedHorseNos.includes(runner.horseNo);
                const selected = [
                  ...basketItems,
                  ...(pendingBet ? [pendingBet] : []),
                ].some(
                  (item) =>
                    item.horseNo === runner.horseNo ||
                    item.placeHorseNo === runner.horseNo ||
                    item.selectedLegHorseNos?.includes(runner.horseNo),
                ) ||
                (quinellaMode &&
                  (quinellaDraft.bankerHorseNo === runner.horseNo ||
                    quinellaDraft.legHorseNos.includes(runner.horseNo)));
                const winSelected =
                  pendingBet?.id === getBasketItemId(runner.horseNo, "WIN") ||
                  basketItems.some(
                    (item) =>
                      item.id === getBasketItemId(runner.horseNo, "WIN"),
                  );
                const placeSelected =
                  pendingBet?.id === getBasketItemId(runner.horseNo, "PLACE") ||
                  basketItems.some(
                    (item) =>
                      item.id === getBasketItemId(runner.horseNo, "PLACE"),
                  );
                const winPlaceSelected =
                  pendingBet?.id ===
                    getBasketItemId(runner.horseNo, "WIN_PLACE") ||
                  basketItems.some(
                    (item) =>
                      item.id === getBasketItemId(runner.horseNo, "WIN_PLACE"),
                  );
                const winDisabled = !runner.oddsAvailable || !runner.winOdds;
                const placeDisabled =
                  !placeAvailable ||
                  !runner.placeOddsAvailable ||
                  !runner.placeOdds;
                const winPlaceDisabled = winDisabled || placeDisabled;
                const comboWinSelected =
                  selectionMode === "combo" &&
                  comboWinHorseNo === runner.horseNo;
                const comboPlaceSelected =
                  selectionMode === "combo" &&
                  comboPlaceHorseNo === runner.horseNo;
                const quinellaBankerSelected =
                  quinellaMode && quinellaDraft.bankerHorseNo === runner.horseNo;
                const quinellaLegSelected =
                  quinellaMode &&
                  quinellaDraft.legHorseNos.includes(runner.horseNo);
                const runnerHorseWeight = formatRunnerHorseWeight(
                  runner.horseWeight,
                  language,
                );
                const detailStats = [
                  { label: t.horseAge, value: runner.age },
                  { label: t.horseWeight, value: runnerHorseWeight },
                  { label: t.rating, value: runner.rating },
                  { label: t.draw, value: runner.draw || "-" },
                ];
                const hasDetailStats = detailStats.some((stat) => stat.value);
                const statsId = `runner-stats-${runner.horseNo}`;
                const runnerOddsContent = quinellaMode ? (
                  <>
                    <button
                      aria-label="Banker"
                      aria-pressed={quinellaBankerSelected}
                      className={quinellaBankerSelected ? "active" : ""}
                      disabled={!quinellaAvailable}
                      onClick={() => handleSelectQuinellaBanker(runner)}
                      type="button"
                    >
                      <b>1</b>
                    </button>
                    <button
                      aria-label="Leg"
                      aria-pressed={quinellaLegSelected}
                      className={quinellaLegSelected ? "active" : ""}
                      disabled={
                        !quinellaAvailable ||
                        (quinellaDraft.legHorseNos.length >= 5 &&
                          !quinellaLegSelected)
                      }
                      onClick={() => handleToggleQuinellaLeg(runner)}
                      type="button"
                    >
                      <b>2</b>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      aria-pressed={
                        selectionMode === "combo" ? comboWinSelected : winSelected
                      }
                      className={
                        (selectionMode === "combo" ? comboWinSelected : winSelected)
                          ? "active"
                          : ""
                      }
                      disabled={winDisabled}
                      onClick={() =>
                        selectionMode === "combo"
                          ? selectComboWin(runner)
                          : addBasketItem(runner, "WIN")
                      }
                      type="button"
                    >
                      <b>{runnerBetButtonLabels.win}</b>
                      {runner.oddsAvailable && runner.winOdds
                        ? runner.winOdds
                        : "---"}
                    </button>
                    <button
                      aria-pressed={
                        selectionMode === "combo"
                          ? comboPlaceSelected
                          : placeSelected
                      }
                      className={
                        (
                          selectionMode === "combo"
                            ? comboPlaceSelected
                            : placeSelected
                        )
                          ? "active"
                          : ""
                      }
                      disabled={placeDisabled}
                      onClick={() =>
                        selectionMode === "combo"
                          ? selectComboPlace(runner)
                          : addBasketItem(runner, "PLACE")
                      }
                      type="button"
                    >
                      <b>{runnerBetButtonLabels.place}</b>
                      {runner.placeOddsAvailable && runner.placeOdds
                        ? runner.placeOdds
                        : "---"}
                    </button>
                    <button
                      aria-pressed={winPlaceSelected}
                      className={winPlaceSelected ? "active" : ""}
                      disabled={selectionMode === "combo" || winPlaceDisabled}
                      onClick={() => addBasketItem(runner, "WIN_PLACE")}
                      type="button"
                    >
                      <b>{runnerBetButtonLabels.winPlace}</b>
                    </button>
                  </>
                );

                return (
                  <article
                    className={`runner-row ${selected ? "is-selected" : ""} ${
                      expanded ? "is-expanded" : ""
                    }`}
                    key={`${runner.horseNo}-${runner.brandNo}`}
                  >
                    {!expanded ? (
                      <div className="runner-row-main">
                        <span
                          className="runner-rail"
                          onClick={() => toggleExpandedHorse(runner.horseNo)}
                        >
                          <strong>{runner.horseNo}</strong>
                          <SilkPlaceholder horseNo={runner.horseNo} />
                        </span>
                        <span
                          className="runner-core"
                          onClick={() => toggleExpandedHorse(runner.horseNo)}
                        >
                          <strong>{runner.name}</strong>
                          <span className="runner-people">
                            <span>
                              <b>У</b> {runner.jockey || "-"}
                            </span>
                            <span>
                              <b>Уя</b> {runner.trainer || "-"}
                            </span>
                            <span>
                              <b>{t.draw}</b> {runner.draw || "-"}
                            </span>
                          </span>
                          {runner.hotFavourite ? (
                            <span className="runner-hot">{t.hotFavourite}</span>
                          ) : null}
                        </span>
                        <span
                          className={`runner-odds-grid ${quinellaMode ? "is-quinella-grid" : ""}`}
                        >
                          {runnerOddsContent}
                        </span>
                        <button
                          aria-label={t.moreStats}
                          aria-controls={statsId}
                          aria-expanded={expanded}
                          className="runner-expand"
                          onClick={() => toggleExpandedHorse(runner.horseNo)}
                          type="button"
                        >
                          <FaChevronDown />
                        </button>
                        <span className="runner-select-dot" aria-hidden="true" />
                      </div>
                    ) : null}
                    {expanded ? (
                      <div className="runner-detail-card" id={statsId}>
                        <div className="runner-detail-hero">
                          <div className="runner-detail-summary">
                            <div className="runner-detail-badge">
                              <strong>{runner.horseNo}</strong>
                              <SilkPlaceholder horseNo={runner.horseNo} />
                            </div>
                            <div className="runner-detail-copy">
                              <div className="runner-detail-summary-top">
                                <div className="runner-detail-title-block">
                                  <div className="runner-detail-title-row">
                                    <strong>{runner.name}</strong>
                                    {runner.hotFavourite ? (
                                      <span className="runner-hot runner-detail-hot">
                                        {t.hotFavourite}
                                      </span>
                                    ) : null}
                                  </div>
                                  {runner.brandNo ? (
                                    <span className="runner-detail-brand">
                                      {runner.brandNo}
                                    </span>
                                  ) : null}
                                </div>
                                <div
                                  className={`runner-detail-odds ${quinellaMode ? "is-quinella-grid" : ""}`}
                                >
                                  {runnerOddsContent}
                                </div>
                              </div>
                              <div className="runner-detail-meta">
                                <span className="runner-detail-meta-item">
                                  <b>Унаач</b>
                                  <span>{runner.jockey || "-"}</span>
                                </span>
                                <span className="runner-detail-meta-item">
                                  <b>Уяач</b>
                                  <span>{runner.trainer || "-"}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="runner-detail-side" aria-hidden="true">
                          <img
                            alt=""
                            className="runner-detail-horse-image"
                            src="/images/horse-placeholder.png"
                          />
                        </div>
                        <div className="runner-detail-panels">
                          <div className="runner-detail-panel">
                            <div className="runner-detail-panel-header">
                              <span className="runner-detail-panel-title">
                                {t.moreStats}
                              </span>
                            </div>
                            {hasDetailStats ? (
                              <div className="runner-detail-fact-grid">
                                {detailStats.map((stat) => (
                                  <RunnerStatTile
                                    key={stat.label}
                                    label={stat.label}
                                    value={stat.value}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="muted">{t.noExtraStats}</span>
                            )}
                          </div>
                          <RunnerLast6Panel
                            label={t.last6}
                            value={runner.last6Runs}
                          />
                          <div className="runner-detail-actions">
                            <button
                              aria-label={t.hideStats}
                              aria-controls={statsId}
                              aria-expanded={expanded}
                              className="runner-detail-collapse"
                              onClick={() => toggleExpandedHorse(runner.horseNo)}
                              type="button"
                            >
                              <FaChevronUp />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {pendingBet ? (
              <div className="bet-confirm-sheet">
                <span className="bet-confirm-handle" aria-hidden="true" />
                <div className="bet-confirm-main">
                  <div>
                    <span>
                      {t.noOfBets}:{" "}
                      <strong>
                        {getBetLineCount(pendingBet.betType, {
                          quinellaLegHorseNos: pendingBet.selectedLegHorseNos,
                        })}
                      </strong>
                    </span>
                    <strong>
                      {t.race} {pendingBet.raceNo} <span>|</span>{" "}
                      {getBetTypeLabel(pendingBet.betType)}
                    </strong>
                    <p>
                      {pendingBet.horseNo}
                      {pendingBet.placeHorseNo
                        ? ` + ${pendingBet.placeHorseNo}`
                        : pendingBet.selectedLegHorseNos?.length
                          ? ` > ${pendingBet.selectedLegHorseNos.join(" + ")}`
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleBasketItem(pendingBet)}
                    type="button"
                  >
                    {t.addToBetSlip}
                  </button>
                </div>
              </div>
            ) : null}

            <div
              aria-hidden="true"
              className={`bet-slip-backdrop ${betSlipOpen ? "is-visible" : ""}`}
              onClick={closeBetSlipPanel}
            />
            <aside
              className={`bet-slip basket-slip ${betSlipOpen ? "is-expanded" : "is-collapsed"}`}
              id="betslip"
            >
              <div className="bet-slip-panel-top">
                <button
                  className="bet-slip-panel-close"
                  onClick={closeBetSlipPanel}
                  type="button"
                >
                  {t.hideBetslip}
                </button>
              </div>

              <div
                className="bet-slip-tabs"
                role="tablist"
              >
                <button
                  aria-selected={betSlipTab === "quick"}
                  className={betSlipTab === "quick" ? "active" : ""}
                  onClick={() => setBetSlipTab("quick")}
                  role="tab"
                  type="button"
                >
                  {t.openBetslip} <span>{basketItems.length}</span>
                </button>
                {/* <button
                  aria-selected={betSlipTab === "basket"}
                  className={betSlipTab === "basket" ? "active" : ""}
                  onClick={() => setBetSlipTab("basket")}
                  role="tab"
                  type="button"
                >
                  {t.basket} <span>{comboBetItems.length}</span>
                </button> */}
              </div>

              <div className="bet-slip-mobile-summary">
                <button
                  aria-expanded={betSlipOpen}
                  className="bet-slip-drawer-toggle"
                  onClick={toggleBetSlip}
                  type="button"
                >
                  <span>{betSlipOpen ? t.hideBetslip : t.openBetslip}</span>
                  <strong>
                    {t.noOfBets}: {basketTotals.lineCount}
                  </strong>
                  <small>
                    {basketItems.length
                      ? basketItems
                          .slice(0, 3)
                          .map(
                            (item) =>
                              `${item.horseNo}${
                                item.placeHorseNo
                                  ? `+${item.placeHorseNo}`
                                  : item.selectedLegHorseNos?.length
                                    ? `>${item.selectedLegHorseNos.join("+")}`
                                    : ""
                              } ${getBetSlipBetTypeLabel(item.betType, language, t)}`,
                           )
                           .join(" / ")
                       : t.emptyBetSlip}
                  </small>
                </button>
                <div className="bet-slip-mobile-metric">
                  <span className="badge-label">{t.totalAmount}</span>
                  <strong>
                    {formatCoins(basketTotals.totalStake, language)}
                  </strong>
                </div>
              </div>

              <div className="bet-slip-body basket-slip-body">
                <div className="basket-slip-heading">
                  <div>
                    <span className="badge-label">{t.basket}</span>
                  </div>
                  <button
                    className="button secondary basket-slip-close"
                    onClick={toggleBetSlip}
                    type="button"
                  >
                    {t.hideBetslip}
                  </button>
                </div>

                {visibleBetSlipItems.length ? (
                  <div className="basket-item-list">
                    {visibleBetSlipItems.map((item) => {
                      const runner = getRunnerByHorseNo(
                        raceCard.runners,
                        item.horseNo,
                      );
                      const lineCount = getBetLineCount(item.betType, {
                        quinellaLegHorseNos: item.selectedLegHorseNos,
                      });
                      const parsedStake = parseStakeInput(item.unitBetAmount);
                      const lineTotal =
                        parsedStake === null ? 0 : parsedStake * lineCount;
                      const placeRunner = item.placeHorseNo
                        ? getRunnerByHorseNo(
                            raceCard.runners,
                            item.placeHorseNo,
                          )
                        : null;

                      return (
                        <article className="basket-item-card" key={item.id}>
                          <button
                            aria-label={t.removeBet}
                            className="basket-remove-button"
                            onClick={() => removeBasketItem(item.id)}
                            type="button"
                          >
                            x
                          </button>
                          <div className="basket-item-main">
                            <span className="muted">
                              {t.race} {raceCard.raceNo}
                            </span>
                            <strong>
                              {item.horseNo} {item.horseName}
                            </strong>
                            {item.betType === "QUINELLA" &&
                            item.selectedLegHorseNos?.length ? (
                              <strong>
                                Legs: {item.selectedLegHorseNos.join(", ")}
                              </strong>
                            ) : null}
                            {item.betType === "WIN_PLACE_COMBO" &&
                            item.placeHorseNo ? (
                              <strong>
                                {item.placeHorseNo} {item.placeHorseName}
                              </strong>
                            ) : null}
                            <span>
                              {t.betTypeText}:{" "}
                              {getBetSlipBetTypeLabel(item.betType, language, t)}
                            </span>
                          </div>
                          <div className="basket-item-stake">
                            <label htmlFor={`basket-stake-${item.id}`}>
                              {t.unitBet}
                            </label>
                            <input
                              className="input"
                              id={`basket-stake-${item.id}`}
                              inputMode="numeric"
                              min={MIN_BET_AMOUNT}
                              onChange={(event) =>
                                updateBasketStake(item.id, event.target.value)
                              }
                              type="number"
                              value={item.unitBetAmount}
                            />
                          </div>
                          <div className="basket-item-total">
                            {/* <span>
                              {t.noOfBets}: {lineCount}
                            </span> */}
                            {/* <strong>
                              {t.betTotal}: {formatCoins(lineTotal, language)}
                            </strong> */}
                            {runner ? (
                              <span className="muted">
                                {item.betType === "QUINELLA"
                                  ? (item.selectedLegHorseNos ?? [])
                                      .map((legHorseNo) => {
                                        const odds =
                                          item.quotedQuinellaOdds?.[
                                            legHorseNo
                                          ] ?? "-";
                                        return `${runner.horseNo}-${legHorseNo} ${odds}x`;
                                      })
                                      .join(" / ")
                                  : item.betType === "WIN_PLACE_COMBO"
                                  ? `${getRunnerLockedWinOdds(runner) ?? "-"}x / ${getRunnerLockedPlaceOdds(placeRunner) ?? "-"}x`
                                  : getBetLineTypes(item.betType)
                                      .map((lineType) => {
                                        const odds =
                                          lineType === "WIN"
                                            ? getRunnerLockedWinOdds(runner)
                                            : getRunnerLockedPlaceOdds(runner);
                                        return odds === null
                                          ? "-"
                                          : `${odds}x`;
                                      })
                                      .join(" / ")}
                              </span>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="message">{t.emptyBetSlip}</p>
                )}

                <div className="basket-slip-totals">
                  {/* <div>
                    <span>{t.totalAmount}</span>
                    <strong>
                      {formatCoins(basketTotals.totalStake, language)}
                    </strong>
                  </div> */}
                  <div>
                    <span>{t.ifYouWin}</span>
                    <strong>{formatCoins(potentialPayout, language)}</strong>
                  </div>
                  <div>
                    <FaCoins color="gold" />
                    <strong>{formatCoins(balance, language)}</strong>
                  </div>
                </div>
              </div>

              <div className="basket-slip-actions">
                <button
                  className="basket-clear-button"
                  disabled={!basketItems.length}
                  onClick={clearBasketItems}
                  type="button"
                >
                  {t.clear}
                </button>
                <button
                  className="button bet-slip-submit"
                  disabled={pending || !canSubmitBasket}
                  type="submit"
                >
                  {pending ? t.placing : t.placeBet}
                </button>
              </div>
              {message}
            </aside>
          </div>
        </>
      )}
    </ActionForm>
  );
}
