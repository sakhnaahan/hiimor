import { prisma } from "@/lib/prisma";
import { formatCoins } from "@/lib/format";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function AdminPage() {
  const language = await getCurrentLanguage();
  const t = getTranslations(language);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    pendingApprovalCount,
    approvedUserCount,
    totalCoinBalance,
    pendingBetCount,
    todayBetAggregate,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { status: "approved" } }),
    prisma.user.aggregate({
      where: { status: "approved" },
      _sum: { coinBalance: true },
    }),
    prisma.raceResult.count({ where: { result: "PENDING" } }),
    prisma.coinTransaction.aggregate({
      where: {
        type: "BET_PLACED",
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
  ]);
  const totalCoins = totalCoinBalance._sum.coinBalance ?? 0;
  const todayBetVolume = Math.abs(todayBetAggregate._sum.amount ?? 0);

  return (
    <div className="grid">
      <section className="hero panel" />

      <section className="grid grid-3">
        <div className="card">
          <p className="muted">{t.pendingApprovals}</p>
          <div className="stat">{pendingApprovalCount}</div>
        </div>
        <div className="card">
          <p className="muted">{t.approvedUsers}</p>
          <div className="stat">{approvedUserCount}</div>
        </div>
        <div className="card">
          <p className="muted">{t.systemCoins}</p>
          <div className="stat">{formatCoins(totalCoins, language)}</div>
        </div>
        <div className="card">
          <p className="muted">{t.pendingBetsAdmin}</p>
          <div className="stat">{pendingBetCount}</div>
        </div>
        <div className="card">
          <p className="muted">{t.todayBetVolume}</p>
          <div className="stat">{formatCoins(todayBetVolume, language)}</div>
        </div>
      </section>
    </div>
  );
}
