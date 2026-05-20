import Link from "next/link";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { RaceAutoRefresh } from "@/components/race-auto-refresh";
import { RaceBettingShell } from "@/components/race-betting-shell";
import { RaceSummaryHeader } from "@/components/race-summary-header";
import { getHkjcUpcomingRaceCard } from "@/lib/hkjc-racecard";
import { settlePendingHkjcBets } from "@/lib/hkjc-settlement";
import { SettlementPoller } from "@/components/settlement-poller";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

const HONG_KONG_LIVE_STREAM_URL = "https://www.youtube.com/@WHR-HK/streams";
export default async function RacePage({
  searchParams,
}: {
  searchParams?: Promise<{
    raceDate?: string;
    racecourse?: string;
    raceNo?: string;
  }>;
}) {
  const user = await requireApprovedUser();
  await ensureBootstrapData();
  const language = await getCurrentLanguage();
  const t = getTranslations(language);
  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    await settlePendingHkjcBets({ userId: user.id });
  }
  const resolvedSearchParams = await searchParams;
  const selectedRaceNo = Number(resolvedSearchParams?.raceNo);
  const raceRequest =
    Number.isInteger(selectedRaceNo) &&
    resolvedSearchParams?.raceDate &&
    resolvedSearchParams.racecourse
      ? {
          raceDate: resolvedSearchParams.raceDate,
          racecourse: resolvedSearchParams.racecourse,
          raceNo: selectedRaceNo,
        }
      : {};
  const [freshUser, hkjcRaceCard, pendingRaceCount] = await Promise.all([
    isAdmin
      ? Promise.resolve(null)
      : prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    getHkjcUpcomingRaceCard(raceRequest),
    isAdmin
      ? prisma.raceResult.count({ where: { result: "PENDING" } })
      : prisma.raceResult.count({
          where: { userId: user.id, result: "PENDING" },
        }),
  ]);
  const raceDetails = hkjcRaceCard.ok
    ? [
        hkjcRaceCard.raceCard.surface,
        hkjcRaceCard.raceCard.course,
        hkjcRaceCard.raceCard.distance,
        hkjcRaceCard.raceCard.going,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="grid">
      <RaceAutoRefresh intervalMs={30_000} />
      <SettlementPoller enabled={!isAdmin && pendingRaceCount > 0} />
      <section className="panel race-panel">
        {hkjcRaceCard.ok ? (
          <>
            {isAdmin ? (
              <RaceSummaryHeader
                language={language}
                liveStreamUrl={HONG_KONG_LIVE_STREAM_URL}
                mobileBetMenuOpen={false}
                mobileBetMode="win-place"
                onCloseBetMenu={() => {}}
                onOpenBetMenu={() => {}}
                onSelectBetMode={() => {}}
                pendingRaceCount={pendingRaceCount}
                raceCard={hkjcRaceCard.raceCard}
                raceDetails={raceDetails}
                showBetModeControls={false}
              />
            ) : (
              <RaceBettingShell
                balance={freshUser!.coinBalance}
                language={language}
                liveStreamUrl={HONG_KONG_LIVE_STREAM_URL}
                pendingRaceCount={pendingRaceCount}
                raceCard={hkjcRaceCard.raceCard}
                raceDetails={raceDetails}
              >
                {hkjcRaceCard.raceCard.raceOptions.length > 0 ? (
                  <div className="race-tabs">
                    {hkjcRaceCard.raceCard.raceOptions.map((race) => (
                      <Link
                        className={`race-tab ${race.raceNo === hkjcRaceCard.raceCard.raceNo ? "active" : ""}`}
                        href={`/race?raceDate=${encodeURIComponent(race.raceDate)}&racecourse=${encodeURIComponent(
                          race.racecourseCode,
                        )}&raceNo=${race.raceNo}`}
                        key={race.raceNo}
                      >
                        {race.raceNo}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </RaceBettingShell>
            )}
            {isAdmin && hkjcRaceCard.raceCard.raceOptions.length > 0 ? (
              <div className="race-tabs">
                {hkjcRaceCard.raceCard.raceOptions.map((race) => (
                  <Link
                    className={`race-tab ${race.raceNo === hkjcRaceCard.raceCard.raceNo ? "active" : ""}`}
                    href={`/race?raceDate=${encodeURIComponent(race.raceDate)}&racecourse=${encodeURIComponent(
                      race.racecourseCode,
                    )}&raceNo=${race.raceNo}`}
                    key={race.raceNo}
                  >
                    {race.raceNo}
                  </Link>
                ))}
              </div>
            ) : null}
            {isAdmin ? (
              <div className="message">{t.adminRaceViewOnly}</div>
            ) : null}
          </>
        ) : (
          <>
            <div className="section-heading">
              <div>
                <h2 className="section-title">{t.chooseHorseAndBet}</h2>
                <p className="muted">{t.racecardUnavailable}</p>
              </div>
            </div>
            <p className="message error">
              {language === "mn" ? t.racecardUnavailable : hkjcRaceCard.message}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
