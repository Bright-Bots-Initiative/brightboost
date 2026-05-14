/**
 * Dashboard — operational landing page at /pathways/facilitator.
 *
 * The questions this page answers, top to bottom:
 *   1. Which of my cohorts are active and how are they doing?
 *   2. What happened across all cohorts this week?
 *   3. What do I need to do right now?
 *
 * Data sources:
 *   GET /api/pathways/cohorts
 *   GET /api/pathways/facilitator/reports/weekly
 *   GET /api/pathways/facilitator/reports/outcomes
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users,
  CalendarDays,
  PlayCircle,
  Download,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Copy,
  CheckCheck,
  Plus,
  Sparkles,
} from "lucide-react";
import Card, { CardBody, CardHeader, StatTile } from "../shared/Card";
import { StatusPill, useFacilitatorOutlet } from "../FacilitatorLayout";

interface WeeklyReport {
  modulesCompleted: number;
  newEnrollments: number;
  inactiveLearners: { id: string; name: string | null }[];
  capstonesInProgress: number;
  recentActivity: Array<{
    id: string;
    moduleSlug: string;
    trackSlug: string;
    status: string;
    score: number | null;
    completedAt: string | null;
    createdAt: string;
    user?: { name: string | null };
  }>;
}

export default function Dashboard() {
  const { t } = useTranslation();
  // Cohorts come from FacilitatorLayout's Outlet context — fetched once per
  // session, so navigating back to the dashboard from another sidebar page
  // doesn't re-hit /api/pathways/cohorts.
  const { cohorts, cohortsLoaded } = useFacilitatorOutlet();
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [weeklyLoaded, setWeeklyLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    // Hard 10s ceiling so a hung backend surfaces as an error UI instead
    // of an indefinite "Loading…" state.
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 10000);
    const headers = { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` };

    fetch("/api/pathways/facilitator/reports/weekly", { headers, signal: ac.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error((body && (body.error || body.message)) || `${r.status} ${r.statusText}`);
        }
        return body;
      })
      .then((w) => {
        if (w && typeof w === "object" && Array.isArray(w.inactiveLearners) && Array.isArray(w.recentActivity)) {
          setWeekly(w as WeeklyReport);
        } else {
          setWeekly(null);
        }
        setLoadError(null);
      })
      .catch((err) => {
        if (err?.name === "AbortError") setLoadError("timeout");
        else setLoadError(err?.message || "fetch failed");
      })
      .finally(() => {
        clearTimeout(timeout);
        setWeeklyLoaded(true);
      });

    return () => {
      clearTimeout(timeout);
      ac.abort();
    };
  }, []);

  const loading = !cohortsLoaded || !weeklyLoaded;
  const activeCohorts = cohorts.filter((c) => c.status === "active");

  const copyCode = (code: string) => {
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(() => {});
  };

  const daysRemaining = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Load error — keep the rest of the page rendering so navigation still works. */}
      {loadError && (
        <Card className="border-amber-300 dark:border-amber-800/40">
          <CardBody className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Couldn't load cohort data
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {loadError}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs px-3 py-1.5 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Retry
            </button>
          </CardBody>
        </Card>
      )}

      {/* Empty state */}
      {!loadError && cohorts.length === 0 && (
        <Card className="text-center py-16">
          <CardBody>
            <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("pathways.facilitator.empty.title")}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
              {t("pathways.facilitator.empty.subtitle")}
            </p>
            <Link
              to="/pathways/facilitator/cohorts/new"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> {t("pathways.facilitator.empty.cta")}
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Active cohorts */}
      {activeCohorts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("pathways.facilitator.dashboard.activeCohortsTitle")}
            </h2>
            <Link
              to="/pathways/facilitator/cohorts"
              className="text-sm text-indigo-700 dark:text-indigo-400 hover:underline"
            >
              {t("pathways.facilitator.dashboard.viewAllCohorts")}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCohorts.map((c) => {
              const remaining = daysRemaining(c.endDate);
              return (
                <Card key={c.id}>
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                        {c.sitePartner && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                            {c.sitePartner}
                          </p>
                        )}
                      </div>
                      <StatusPill status={c.status} />
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/30">
                      <span className="text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-semibold">
                        {t("pathways.facilitator.dashboard.joinCode")}
                      </span>
                      <code className="font-mono text-sm font-bold text-indigo-800 dark:text-indigo-300 flex-1">
                        {c.joinCode}
                      </code>
                      <button
                        onClick={() => copyCode(c.joinCode)}
                        aria-label={t("pathways.common.copy")}
                        className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300"
                      >
                        {copiedCode === c.joinCode ? (
                          <CheckCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                          {t("pathways.facilitator.dashboard.enrolled")}
                        </p>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                          {c._count?.enrollments ?? 0}
                          {c.maxEnrollment && (
                            <span className="text-slate-500 font-normal text-sm"> / {c.maxEnrollment}</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                          {t("pathways.facilitator.dashboard.daysRemaining")}
                        </p>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                          {remaining ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link
                        to={`/pathways/facilitator/cohorts/${c.id}`}
                        className="flex-1 text-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                      >
                        {t("pathways.facilitator.dashboard.openCohort")}
                      </Link>
                      <Link
                        to={`/pathways/facilitator/cohorts/${c.id}#roster`}
                        className="flex-1 text-center px-3 py-1.5 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
                      >
                        {t("pathways.facilitator.dashboard.viewRoster")}
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* This week at a glance */}
      {weekly && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            {t("pathways.facilitator.dashboard.thisWeekTitle")}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label={t("pathways.facilitator.dashboard.modulesCompleted")}
              value={weekly.modulesCompleted}
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatTile
              label={t("pathways.facilitator.dashboard.newEnrollments")}
              value={weekly.newEnrollments}
              icon={<Users className="w-4 h-4" />}
            />
            <StatTile
              label={t("pathways.facilitator.dashboard.needsFollowUp")}
              value={weekly.inactiveLearners.length}
              hint={
                weekly.inactiveLearners.length > 0
                  ? weekly.inactiveLearners
                      .slice(0, 3)
                      .map((l) => l.name)
                      .join(", ")
                  : undefined
              }
              icon={<AlertTriangle className="w-4 h-4" />}
              accentClass={weekly.inactiveLearners.length > 0 ? "border-amber-300 dark:border-amber-800/30" : ""}
            />
            <StatTile
              label={t("pathways.facilitator.dashboard.capstonesInProgress")}
              value={weekly.capstonesInProgress}
              icon={<Sparkles className="w-4 h-4" />}
            />
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {t("pathways.facilitator.dashboard.quickActionsTitle")}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            to="/pathways/facilitator/cohorts/new"
            className="flex items-center gap-3 p-4 rounded-xl border bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-300 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-indigo-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                {t("pathways.facilitator.dashboard.actionCreateCohort")}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t("pathways.facilitator.dashboard.actionCreateCohortSub")}
              </p>
            </div>
          </Link>
          <Link
            to="/pathways/facilitator/cohorts"
            className="flex items-center gap-3 p-4 rounded-xl border bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-300 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-indigo-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                {t("pathways.facilitator.dashboard.actionAddLearner")}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t("pathways.facilitator.dashboard.actionAddLearnerSub")}
              </p>
            </div>
          </Link>
          <Link
            to="/pathways/facilitator/reports"
            className="flex items-center gap-3 p-4 rounded-xl border bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-300 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-indigo-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                {t("pathways.facilitator.dashboard.actionWeeklyReport")}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t("pathways.facilitator.dashboard.actionWeeklyReportSub")}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Recent activity feed */}
      {weekly && weekly.recentActivity.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            {t("pathways.facilitator.dashboard.recentActivityTitle")}
          </h2>
          <Card>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {weekly.recentActivity.slice(0, 10).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  {m.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <PlayCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200">
                      <span className="font-medium">{m.user?.name ?? t("pathways.facilitator.dashboard.aLearner")}</span>{" "}
                      <span className="text-slate-600 dark:text-slate-400">
                        {m.status === "completed"
                          ? t("pathways.facilitator.dashboard.completedModule")
                          : t("pathways.facilitator.dashboard.startedModule")}{" "}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {m.moduleSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      {m.score !== null && (
                        <span className="text-slate-500 dark:text-slate-500"> · {m.score}%</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(m.completedAt ?? m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                </li>
              ))}
            </ul>
            <CardHeader className="border-t border-b-0 border-slate-200 dark:border-slate-700">
              <Link
                to="/pathways/facilitator/reports"
                className="inline-flex items-center gap-1 text-sm text-indigo-700 dark:text-indigo-400 hover:underline"
              >
                {t("pathways.facilitator.dashboard.viewFullReport")} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
          </Card>
        </section>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-6 w-48 mb-3 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-white border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 h-44" />
          ))}
        </div>
      </div>
      <div>
        <div className="h-6 w-40 mb-3 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-white border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
