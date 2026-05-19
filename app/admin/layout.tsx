import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const language = await getCurrentLanguage();
  const t = getTranslations(language);

  return (
    <div className="grid">
      <nav className="nav">
        <Link href="/admin">{t.adminOverview}</Link>
        <Link href="/admin/users">{t.users}</Link>
        <Link href="/admin/bets">{t.bets}</Link>
        <Link href="/admin/transactions">{t.transactions}</Link>
      </nav>
      {children}
    </div>
  );
}
