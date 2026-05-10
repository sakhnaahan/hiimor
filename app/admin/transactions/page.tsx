import { prisma } from "@/lib/prisma";
import { formatCoins, formatDate } from "@/lib/format";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function AdminTransactionsPage() {
  const language = await getCurrentLanguage();
  const t = getTranslations(language);
  const transactions = await prisma.coinTransaction.findMany({
    where: {
      type: {
        notIn: ["BET_PLACED", "RACE_WIN", "RACE_LOSS"],
      },
    },
    include: { user: true, admin: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="grid">
      <h1 className="page-title">{t.transactions}</h1>
      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t.time}</th>
                <th>{t.user}</th>
                <th>{t.type}</th>
                <th>{t.amount}</th>
                <th>{t.before}</th>
                <th>{t.after}</th>
                <th>{t.admin}</th>
                <th>{t.race}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDate(transaction.createdAt, language)}</td>
                  <td>{transaction.user.username}</td>
                  <td>{transaction.type}</td>
                  <td>{formatCoins(transaction.amount, language)}</td>
                  <td>{formatCoins(transaction.balanceBefore, language)}</td>
                  <td>{formatCoins(transaction.balanceAfter, language)}</td>
                  <td>{transaction.admin?.username ?? "-"}</td>
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
