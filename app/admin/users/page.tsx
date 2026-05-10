import { prisma } from "@/lib/prisma";
import { formatCoins, formatDate } from "@/lib/format";
import {
  approveUserAction,
  rejectUserAction,
  updateUserRoleAction,
} from "@/app/actions";
import { RechargeForm, ResetPasswordForm, SubtractCoinsForm } from "@/components/admin-forms";
import { requireAdmin } from "@/lib/auth";
import { isMainAdminUsername } from "@/lib/admin";
import { getTranslations, roleLabel, statusLabel } from "@/lib/i18n";
import { getCurrentLanguage } from "@/lib/language";

export default async function AdminUsersPage() {
  const currentAdmin = await requireAdmin();
  const language = await getCurrentLanguage();
  const t = getTranslations(language);
  const users = await prisma.user.findMany({ orderBy: [{ status: "asc" }, { username: "asc" }] });
  const approvedUsers = users.filter((user) => user.status === "approved");
  const canManageRoles = isMainAdminUsername(currentAdmin.username);
  const resettableUsers = users.filter((user) => user.id !== currentAdmin.id && (user.role !== "admin" || canManageRoles));

  return (
    <div className="grid">
      <h1 className="page-title">{t.users}</h1>
      <section className="panel">
        <h2 className="section-title">{t.adjustCoins}</h2>
        {approvedUsers.length ? (
          <div className="grid grid-2">
            <div>
              <h3 className="subsection-title">{t.addCoins}</h3>
              <RechargeForm
                language={language}
                users={approvedUsers.map((user) => ({
                  id: user.id,
                  username: user.username,
                  coinBalance: user.coinBalance,
                }))}
              />
            </div>
            <div>
              <h3 className="subsection-title">{t.subtractCoins}</h3>
              <SubtractCoinsForm
                language={language}
                users={approvedUsers.map((user) => ({
                  id: user.id,
                  username: user.username,
                  coinBalance: user.coinBalance,
                }))}
              />
            </div>
          </div>
        ) : (
          <p className="muted">{t.noApprovedUsers}</p>
        )}
      </section>
      <section className="panel">
        <h2 className="section-title">{t.resetUserPassword}</h2>
        {resettableUsers.length ? (
          <ResetPasswordForm
            language={language}
            users={resettableUsers.map((user) => ({
              id: user.id,
              username: user.username,
            }))}
          />
        ) : (
          <p className="muted">{t.noResetUsers}</p>
        )}
      </section>
      <section className="panel">
        <h2 className="section-title">{t.allUsers}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t.username}</th>
                <th>{t.role}</th>
                <th>{t.status}</th>
                <th>{t.balance}</th>
                <th>{t.created}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{roleLabel(language, user.role)}</td>
                  <td>
                    <span
                      className={`badge ${
                        user.status === "approved"
                          ? "green"
                          : user.status === "rejected"
                            ? "red"
                            : ""
                      }`}
                    >
                      {statusLabel(language, user.status)}
                    </span>
                  </td>
                  <td>{formatCoins(user.coinBalance, language)}</td>
                  <td>{formatDate(user.createdAt, language)}</td>
                  <td>
                    <div className="row-actions">
                      {user.status !== "approved" ? (
                        <form action={approveUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="button" type="submit">
                            {t.approve}
                          </button>
                        </form>
                      ) : null}
                      {user.status !== "rejected" && user.role !== "admin" ? (
                        <form action={rejectUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="button danger" type="submit">
                            {t.reject}
                          </button>
                        </form>
                      ) : null}
                      {canManageRoles && user.status === "approved" && !isMainAdminUsername(user.username) ? (
                        <form action={updateUserRoleAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <input
                            name="role"
                            type="hidden"
                            value={user.role === "admin" ? "player" : "admin"}
                          />
                          <button
                            className={`button ${user.role === "admin" ? "secondary" : "warning"}`}
                            type="submit"
                          >
                            {user.role === "admin" ? t.makePlayer : t.makeAdmin}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
