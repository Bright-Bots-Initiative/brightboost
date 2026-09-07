/**
 * Pending cohort invitations on the Pathways student home (#874).
 *
 * A facilitator can invite an email address to a cohort, but only the learner
 * signed in as that account can turn the invitation into a relationship. This
 * card lists open invitations and lets the learner accept or decline; nothing
 * about the learner is visible to the facilitator until they accept.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";

interface Invitation {
  id: string;
  cohortId: string;
  cohortName: string;
  band: string;
  sitePartner: string | null;
  facilitatorName: string;
  invitedAt: string;
  expiresAt: string;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("bb_access_token")}`,
});

export default function PendingInvitations({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pathways/student/invitations", {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { invitations?: Invitation[] };
      setInvitations(body.invitations ?? []);
    } catch {
      // Invitations are optional on the home page; a failed load shows nothing.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (id: string, action: "accept" | "decline") => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(
        `/api/pathways/student/invitations/${encodeURIComponent(id)}/${action}`,
        { method: "POST", headers: authHeaders() },
      );
      // 409: a duplicate click — the sibling request already transitioned it.
      if (!res.ok && res.status !== 409) {
        setError(t("pathways.home.invitations.error"));
        return;
      }
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      if (action === "accept") onChanged?.();
    } catch {
      setError(t("pathways.home.invitations.error"));
    } finally {
      setBusyId(null);
    }
  };

  if (invitations.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-950/30 p-4 sm:p-5"
      aria-labelledby="pending-invitations-title"
    >
      <div className="flex items-start gap-3">
        <UserPlus className="w-5 h-5 text-indigo-700 dark:text-indigo-300 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2
            id="pending-invitations-title"
            className="font-semibold text-slate-900 dark:text-slate-100"
          >
            {t("pathways.home.invitations.title")}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
            {t("pathways.home.invitations.body")}
          </p>
          <ul className="mt-3 space-y-2">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-white dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 px-3 py-2"
              >
                <div className="flex-1 min-w-[160px]">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {inv.cohortName}
                    {inv.sitePartner ? ` • ${inv.sitePartner}` : ""}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {t("pathways.home.invitations.from", {
                      name: inv.facilitatorName,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === inv.id}
                  onClick={() => respond(inv.id, "accept")}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-sm font-medium min-h-[44px]"
                >
                  {t("pathways.home.invitations.accept")}
                </button>
                <button
                  type="button"
                  disabled={busyId === inv.id}
                  onClick={() => respond(inv.id, "decline")}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium min-h-[44px] hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {t("pathways.home.invitations.decline")}
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <p
              className="text-xs text-red-700 dark:text-red-400 mt-2"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
