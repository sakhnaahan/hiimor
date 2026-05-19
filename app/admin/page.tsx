import { prisma } from "@/lib/prisma";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { requireAdmin } from "@/lib/auth";
import { formatCoins } from "@/lib/format";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function AdminPage() {
  await requireAdmin();
  await ensureBootstrapData();
  const language = await getCurrentLanguage();
  const t = getTranslations(language);

  const [approvedUserCount, totalCoinBalance] = await Promise.all([
    prisma.user.count({ where: { status: "approved" } }),
    prisma.user.aggregate({
      where: { status: "approved" },
      _sum: { coinBalance: true },
    }),
  ]);
  const totalCoins = totalCoinBalance._sum.coinBalance ?? 0;

  return (
    <div className="grid">
      <section className="grid grid-3">
        <div className="card">
          <p className="muted">{t.approvedUsers}</p>
          <div className="stat">{approvedUserCount}</div>
        </div>
        <div className="card">
          <p className="muted">{t.systemCoins}</p>
          <div className="stat">{formatCoins(totalCoins, language)}</div>
        </div>
      </section>
    </div>
  );
}
