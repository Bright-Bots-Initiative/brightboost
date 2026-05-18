/**
 * Cohort Detail page — tabbed interface for a single cohort.
 *
 * Tabs:
 *   - Overview: stats, dates, join code, active tracks
 *   - Roster: enrolled learners, add/remove, progress
 *   - Modules: assigned modules + completion per module
 *   - Calendar: session schedule + due dates (placeholder for now)
 *   - Notes: cohort-wide facilitator notes
 *   - Settings: edit metadata, lifecycle actions, regenerate code
 */
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import {
  ArrowLeft,
  Copy,
  CheckCheck,
  RefreshCw,
  Play,
  Pause,
  CircleSlash,
  Archive,
  Trash2,
  StickyNote,
  Plus,
  Download,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import Card, { CardBody, CardHeader, StatTile } from "../shared/Card";
import { StatusPill } from "../FacilitatorLayout";

type TabKey = "overview" | "roster" | "modules" | "engagement" | "calendar" | "notes" | "settings";

interface Cohort {
  id: string;
  name: string;
  band: string;
  sitePartner: string | null;
  facilitatorId: string;
  joinCode: string;
  status: string;
  description: string | null;
  maxEnrollment: number | null;
  startDate: string | null;
  endDate: string | null;
  trackIds: string[];
  notes: Array<{ text: string; author: string; ts: string }> | null;
  createdAt: string;
  updatedAt: string;
  enrollments: Array<{
    id: string;
    userId: string;
    enrolledAt: string;
    status: string;
    user: { id: string; name: string | null; email: string | null; ageBand: string | null };
  }>;
}

interface CohortProgress {
  enrolledCount: number;
  learners: Array<{
    id: string;
    name: string | null;
    ageBand: string | null;
    milestones: Array<{ moduleSlug: string; status: string; score: number | null; completedAt: string | null }>;
    completedCount: number;
    totalModules: number;
    lastActive: string | null;
  }>;
}

export default function CohortDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [progress, setProgress] = useState<CohortProgress | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);

  const auth = { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` };

  const loadCohort = useCallback(async () => {
    if (!id) return;
    try {
      const [c, p] = await Promise.all([
        fetch(`/api/pathways/cohorts/${id}`, { headers: auth }).then((r) => r.json()),
        fetch(`/api/pathways/facilitator/cohort/${id}/progress`, { headers: auth }).then((r) => r.json()),
      ]);
      setCohort(c);
      setProgress(p);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadCohort();
    // Hash routing for deep-link to roster
    const h = window.location.hash.slice(1);
    if (["overview", "roster", "modules", "calendar", "notes", "settings"].includes(h)) {
      setTab(h as TabKey);
    }
  }, [loadCohort]);

  if (loading) {
    return <div className="text-center py-20 text-slate-600 dark:text-slate-400">{t("pathways.common.loading")}</div>;
  }
  if (!cohort) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-600 dark:text-slate-400">{t("pathways.facilitator.detail.notFound")}</p>
        <button
          onClick={() => navigate("/pathways/facilitator/cohorts")}
          className="mt-3 text-sm text-indigo-700 dark:text-indigo-400 hover:underline"
        >
          {t("pathways.facilitator.create.backToCohorts")}
        </button>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: t("pathways.facilitator.detail.tabs.overview") },
    { key: "roster", label: t("pathways.facilitator.detail.tabs.roster") },
    { key: "modules", label: t("pathways.facilitator.detail.tabs.modules") },
    { key: "engagement", label: t("pathways.facilitator.detail.tabs.engagement", "Engagement") },
    { key: "calendar", label: t("pathways.facilitator.detail.tabs.calendar") },
    { key: "notes", label: t("pathways.facilitator.detail.tabs.notes") },
    { key: "settings", label: t("pathways.facilitator.detail.tabs.settings") },
  ];

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/pathways/facilitator/cohorts")}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" /> {t("pathways.facilitator.create.backToCohorts")}
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{cohort.name}</h1>
            <StatusPill status={cohort.status} />
          </div>
          {cohort.sitePartner && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{cohort.sitePartner}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto -mx-1 px-1">
        {tabs.map((tt) => {
          const active = tab === tt.key;
          return (
            <button
              key={tt.key}
              onClick={() => {
                setTab(tt.key);
                window.location.hash = tt.key;
              }}
              className={`px-3 sm:px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                active
                  ? "text-indigo-700 border-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:border-indigo-500 dark:bg-indigo-600/10"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
              }`}
            >
              {tt.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab cohort={cohort} progress={progress} />}
      {tab === "roster" && <RosterTab cohort={cohort} progress={progress} onReload={loadCohort} />}
      {tab === "modules" && <ModulesTab cohort={cohort} progress={progress} />}
      {tab === "engagement" && <EngagementTab cohortId={cohort.id} progress={progress} />}
      {tab === "calendar" && <CalendarTab cohort={cohort} />}
      {tab === "notes" && <NotesTab cohort={cohort} onReload={loadCohort} />}
      {tab === "settings" && <SettingsTab cohort={cohort} onReload={loadCohort} />}
    </div>
  );
}

// ─── Engagement Tab ─────────────────────────────────────────────────────

interface CohortEngagement {
  enrolled: number;
  avgLevel: number;
  totalXp: number;
  topBadge: { slug: string; name: string; count: number } | null;
  streakBuckets: {
    zero: number;
    oneToThree: number;
    fourToSeven: number;
    eightToFourteen: number;
    fifteenPlus: number;
  };
  dailyGoalRateToday: { complete: number; total: number };
  topByXpThisWeek: Array<{ userId: string; name: string | null; email: string | null; xp: number }>;
}

interface CohortChallenges {
  totalFlags: number;
  averageHintsPerSolve: number;
  mostAttempted: { slug: string; attempts: number } | null;
  challengeCatalogSize?: number;
  perStudent: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    totalFlags: number;
    attempts: number;
    byCategory: Record<string, number>;
  }>;
}

function EngagementTab({
  cohortId,
  progress,
}: {
  cohortId: string;
  progress: CohortProgress | null;
}) {
  const [data, setData] = useState<CohortEngagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"overview" | "challenges">("overview");

  useEffect(() => {
    fetch(`/api/pathways/facilitator/cohorts/${cohortId}/gamification`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [cohortId]);

  if (loading) {
    return (
      <Card>
        <div className="px-5 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
          Loading engagement…
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <div className="px-5 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
          Couldn't load engagement data.
        </div>
      </Card>
    );
  }

  const SubTabBar = (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40 p-1 text-sm">
      <button
        onClick={() => setSubTab("overview")}
        className={`px-3 py-1.5 rounded-md min-h-[36px] font-medium transition-colors ${
          subTab === "overview"
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => setSubTab("challenges")}
        className={`px-3 py-1.5 rounded-md min-h-[36px] font-medium transition-colors ${
          subTab === "challenges"
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        Challenges
      </button>
    </div>
  );

  if (subTab === "challenges") {
    return (
      <div className="space-y-4">
        {SubTabBar}
        <EngagementChallengesPanel cohortId={cohortId} />
      </div>
    );
  }

  const dgPct =
    data.dailyGoalRateToday.total > 0
      ? Math.round((data.dailyGoalRateToday.complete / data.dailyGoalRateToday.total) * 100)
      : 0;

  // Surface basic intervention alerts client-side from existing progress data
  // (avoids a separate endpoint for v1). "Stale" = no lastActive in 5+ days.
  const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
  const staleLearners = (progress?.learners ?? []).filter((l) =>
    l.lastActive ? new Date(l.lastActive).getTime() < fiveDaysAgo : false,
  );

  return (
    <div className="space-y-5">
      {SubTabBar}
      {/* Top-line metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <MetricCell label="Avg Level" value={data.avgLevel} />
        <MetricCell label="Total XP" value={data.totalXp.toLocaleString()} />
        <MetricCell
          label="Daily goal · today"
          value={`${data.dailyGoalRateToday.complete}/${data.dailyGoalRateToday.total}`}
          secondary={`${dgPct}%`}
        />
        <MetricCell
          label="Top badge"
          value={data.topBadge?.name ?? "—"}
          secondary={data.topBadge ? `${data.topBadge.count} earned` : undefined}
        />
      </div>

      {/* Streak distribution */}
      <Card>
        <div className="px-4 sm:px-5 py-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Streak distribution
          </p>
          <div className="space-y-2">
            <StreakBar label="No streak" value={data.streakBuckets.zero} total={data.enrolled} color="bg-slate-400" />
            <StreakBar label="1–3 days" value={data.streakBuckets.oneToThree} total={data.enrolled} color="bg-amber-400" />
            <StreakBar label="4–7 days" value={data.streakBuckets.fourToSeven} total={data.enrolled} color="bg-orange-500" />
            <StreakBar label="8–14 days" value={data.streakBuckets.eightToFourteen} total={data.enrolled} color="bg-indigo-500" />
            <StreakBar label="15+ days" value={data.streakBuckets.fifteenPlus} total={data.enrolled} color="bg-emerald-500" />
          </div>
        </div>
      </Card>

      {/* Top 10 by XP this week */}
      <Card>
        <div className="px-4 sm:px-5 py-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Top XP this week
          </p>
          {data.topByXpThisWeek.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              No XP awarded yet this week.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {data.topByXpThisWeek.map((row, i) => (
                <li
                  key={row.userId}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="w-6 text-right text-slate-500 font-mono">#{i + 1}</span>
                  <Link
                    to={`/pathways/facilitator/learners/${row.userId}`}
                    className="flex-1 min-w-0 truncate text-slate-900 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    {row.name ?? row.email ?? "—"}
                  </Link>
                  <span className="font-mono text-indigo-700 dark:text-indigo-300 shrink-0">
                    +{row.xp.toLocaleString()} XP
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>

      {/* Lightweight intervention list */}
      {staleLearners.length > 0 && (
        <Card>
          <div className="px-4 sm:px-5 py-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">
              ⚠ Consider reaching out
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              These learners haven't been active in 5+ days.
            </p>
            <ul className="space-y-1.5">
              {staleLearners.map((l) => (
                <li key={l.id} className="text-sm">
                  <Link
                    to={`/pathways/facilitator/learners/${l.id}`}
                    className="text-slate-900 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    {l.name ?? "—"}
                  </Link>
                  <span className="text-xs text-slate-500 ml-2">
                    last active{" "}
                    {l.lastActive ? new Date(l.lastActive).toLocaleDateString() : "never"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}

function EngagementChallengesPanel({ cohortId }: { cohortId: string }) {
  const [data, setData] = useState<CohortChallenges | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pathways/facilitator/cohorts/${cohortId}/challenges`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [cohortId]);

  if (loading) {
    return (
      <Card>
        <div className="px-5 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
          Loading challenges…
        </div>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <div className="px-5 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
          Couldn't load CTF data.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top-line */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <MetricCell label="Total flags" value={data.totalFlags} />
        <MetricCell
          label="Avg hints / solve"
          value={data.averageHintsPerSolve.toFixed(1)}
          secondary={data.averageHintsPerSolve > 2 ? "high — consider group instruction" : undefined}
        />
        <MetricCell
          label="Most attempted"
          value={data.mostAttempted?.slug ?? "—"}
          secondary={data.mostAttempted ? `${data.mostAttempted.attempts} attempts` : undefined}
        />
      </div>

      {/* Per-student flag breakdown */}
      <Card>
        <div className="px-4 sm:px-5 py-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Per-student flags
          </p>
          {data.perStudent.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">No learners enrolled.</p>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden space-y-2">
                {data.perStudent.map((s) => (
                  <Link
                    key={s.userId}
                    to={`/pathways/facilitator/learners/${s.userId}`}
                    className="block rounded-lg border bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700/40 p-3 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {s.name ?? s.email ?? "—"}
                      </p>
                      <span className="font-mono text-xs shrink-0 text-emerald-700 dark:text-emerald-400 font-semibold">
                        {s.totalFlags}/{data.challengeCatalogSize ?? 24}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                      <CatBadge label="crypto" n={s.byCategory.cryptography ?? 0} />
                      <CatBadge label="web" n={s.byCategory.web ?? 0} />
                      <CatBadge label="forensics" n={s.byCategory.forensics ?? 0} />
                      <CatBadge label="networks" n={s.byCategory.networks ?? 0} />
                      <span className="ml-auto text-slate-500">{s.attempts} attempts</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop: table */}
              <table className="hidden md:table w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 pr-3">Learner</th>
                    <th className="py-2 px-2 text-right">Flags</th>
                    <th className="py-2 px-2 text-right">Crypto</th>
                    <th className="py-2 px-2 text-right">Web</th>
                    <th className="py-2 px-2 text-right">Forensics</th>
                    <th className="py-2 px-2 text-right">Networks</th>
                    <th className="py-2 pl-2 text-right">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.perStudent.map((s) => (
                    <tr key={s.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2 pr-3">
                        <Link
                          to={`/pathways/facilitator/learners/${s.userId}`}
                          className="text-slate-900 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                        >
                          {s.name ?? s.email ?? "—"}
                        </Link>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        {s.totalFlags}/{data.challengeCatalogSize ?? 24}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                        {s.byCategory.cryptography ?? 0}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                        {s.byCategory.web ?? 0}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                        {s.byCategory.forensics ?? 0}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                        {s.byCategory.networks ?? 0}
                      </td>
                      <td className="py-2 pl-2 text-right text-slate-500 dark:text-slate-500">
                        {s.attempts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function CatBadge({ label, n }: { label: string; n: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
        n > 0
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
      }`}
    >
      {label} <span className="font-mono">{n}</span>
    </span>
  );
}

function MetricCell({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string | number;
  secondary?: string;
}) {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
        {label}
      </p>
      <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
        {value}
      </p>
      {secondary && (
        <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{secondary}</p>
      )}
    </div>
  );
}

function StreakBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 text-xs text-slate-600 dark:text-slate-400 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-700 dark:text-slate-300 w-10 text-right shrink-0">
        {value}
      </span>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────

function OverviewTab({ cohort, progress }: { cohort: Cohort; progress: CohortProgress | null }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const totalCompletion = progress
    ? progress.learners.reduce((sum, l) => sum + l.completedCount, 0)
    : 0;
  const possibleCompletion = progress ? progress.learners.length * 7 : 0;
  const pct = possibleCompletion > 0 ? Math.round((totalCompletion / possibleCompletion) * 100) : 0;

  const copy = () => {
    navigator.clipboard?.writeText(cohort.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label={t("pathways.facilitator.detail.overview.enrolled")}
          value={`${cohort.enrollments.length}${cohort.maxEnrollment ? ` / ${cohort.maxEnrollment}` : ""}`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatTile
          label={t("pathways.facilitator.detail.overview.completion")}
          value={`${pct}%`}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatTile
          label={t("pathways.facilitator.detail.overview.startDate")}
          value={cohort.startDate ? new Date(cohort.startDate).toLocaleDateString() : "—"}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatTile
          label={t("pathways.facilitator.detail.overview.endDate")}
          value={cohort.endDate ? new Date(cohort.endDate).toLocaleDateString() : "—"}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 dark:text-slate-200">
            {t("pathways.facilitator.detail.overview.joinCodeTitle")}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/30 max-w-md">
            <code className="font-mono text-2xl font-bold text-indigo-700 dark:text-indigo-300 tracking-wider">
              {cohort.joinCode}
            </code>
            <button
              onClick={copy}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700/50 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-800/30"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("pathways.facilitator.detail.overview.copied") : t("pathways.common.copy")}
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            {t("pathways.facilitator.detail.overview.joinCodeHint")}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 dark:text-slate-200">
            {t("pathways.facilitator.detail.overview.activeTracksTitle")}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {cohort.trackIds.map((slug) => {
              const track = PATHWAY_TRACKS.find((tr) => tr.slug === slug);
              return (
                <div
                  key={slug}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-700/50"
                >
                  <div
                    className="w-2 h-8 rounded-full"
                    style={{ backgroundColor: track?.color ?? "#64748b" }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t(`pathways.tracks.items.${slug}.name`, track?.name ?? slug)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {track?.modules.length ?? 0} {t("pathways.tracks.modulesCount", { count: track?.modules.length ?? 0 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {cohort.description && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-slate-200">
              {t("pathways.facilitator.detail.overview.descriptionTitle")}
            </h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {cohort.description}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ─── Roster Tab ─────────────────────────────────────────────────────────

function RosterTab({
  cohort,
  progress,
  onReload,
}: {
  cohort: Cohort;
  progress: CohortProgress | null;
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const auth = { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` };

  const addLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addEmail.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pathways/facilitator/cohorts/${cohort.id}/learners`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ email: addEmail.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add learner");
      }
      setAddEmail("");
      onReload();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add learner");
    } finally {
      setSubmitting(false);
    }
  };

  const removeLearner = async (userId: string, name: string | null) => {
    if (!window.confirm(t("pathways.facilitator.detail.roster.confirmRemove", { name: name ?? "this learner" }))) return;
    await fetch(`/api/pathways/facilitator/cohorts/${cohort.id}/learners/${userId}`, {
      method: "DELETE",
      headers: auth,
    });
    onReload();
  };

  const exportCsv = () => {
    window.open(
      `/api/pathways/facilitator/cohorts/${cohort.id}/export?token=${localStorage.getItem("bb_access_token") ?? ""}`,
      "_blank",
    );
    // Note: query-string auth is a fallback for the download attribute. For full security,
    // a one-time signed download URL would be better. For demo purposes the Authorization
    // header would normally be used, but window.open can't carry headers. Leaving as-is
    // and treating CSV export as a same-session convenience.
  };

  return (
    <div className="space-y-4">
      <form onSubmit={addLearner} className="flex flex-wrap gap-2 items-start">
        <div className="flex-1 min-w-[200px]">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder={t("pathways.facilitator.detail.roster.addEmailPlaceholder") as string}
            className="w-full px-3 py-2 rounded-lg border bg-white border-slate-200 text-sm text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {addError && <p className="text-xs text-red-700 dark:text-red-400 mt-1">{addError}</p>}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> {t("pathways.facilitator.detail.roster.addLearner")}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 text-sm font-medium"
        >
          <Download className="w-4 h-4" /> {t("pathways.common.exportCsv")}
        </button>
      </form>

      {cohort.enrollments.length === 0 ? (
        <Card>
          <div className="px-5 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
            {t("pathways.facilitator.detail.roster.empty")}
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {cohort.enrollments.map((e) => {
              const lp = progress?.learners.find((l) => l.id === e.user.id);
              return (
                <div
                  key={e.id}
                  className="rounded-xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/pathways/facilitator/learners/${e.user.id}`}
                      className="font-semibold text-slate-900 dark:text-slate-100 truncate flex-1 min-w-0"
                    >
                      {e.user.name ?? e.user.email}
                    </Link>
                    <button
                      onClick={() => removeLearner(e.user.id, e.user.name)}
                      aria-label={t("pathways.facilitator.detail.roster.removeLearner") as string}
                      className="shrink-0 p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-slate-500 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {e.user.name && e.user.email && (
                    <p className="text-xs text-slate-600 dark:text-slate-500 truncate">{e.user.email}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {lp?.completedCount ?? 0}
                      </span>
                      <span className="text-slate-500">/7 modules</span>
                    </span>
                    <span className="text-slate-600 dark:text-slate-500">
                      {lp?.lastActive ? new Date(lp.lastActive).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3">{t("pathways.facilitator.detail.roster.col.name")}</th>
                  <th className="px-5 py-3">{t("pathways.facilitator.detail.roster.col.completed")}</th>
                  <th className="px-5 py-3">{t("pathways.facilitator.detail.roster.col.lastActive")}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {cohort.enrollments.map((e) => {
                  const lp = progress?.learners.find((l) => l.id === e.user.id);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3">
                        <Link
                          to={`/pathways/facilitator/learners/${e.user.id}`}
                          className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-300"
                        >
                          {e.user.name ?? e.user.email}
                        </Link>
                        <p className="text-xs text-slate-600 dark:text-slate-500">{e.user.email}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                        {lp?.completedCount ?? 0}<span className="text-slate-500">/7</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-500">
                        {lp?.lastActive ? new Date(lp.lastActive).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => removeLearner(e.user.id, e.user.name)}
                          aria-label={t("pathways.facilitator.detail.roster.removeLearner") as string}
                          className="p-1.5 rounded text-slate-500 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Modules Tab ────────────────────────────────────────────────────────

const CYBER_MODULE_SLUGS = [
  "cyber-foundations",
  "digital-safety-sim",
  "network-basics",
  "threat-detective",
  "career-map",
  "cisco-netacad-link",
  "capstone-security-plan",
];

function ModulesTab({ cohort, progress }: { cohort: Cohort; progress: CohortProgress | null }) {
  const { t } = useTranslation();
  const enrolled = cohort.enrollments.length;

  const rows = CYBER_MODULE_SLUGS.map((slug, i) => {
    let completed = 0;
    let inProgress = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    for (const l of progress?.learners ?? []) {
      const m = l.milestones.find((ms) => ms.moduleSlug === slug);
      if (m?.status === "completed") {
        completed++;
        if (m.score !== null) {
          scoreSum += m.score;
          scoreCount++;
        }
      } else if (m?.status === "in_progress") {
        inProgress++;
      }
    }
    const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;
    const completionPct = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;
    return { slug, i, completed, inProgress, avgScore, completionPct };
  });

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {rows.map((r) => (
          <div
            key={r.slug}
            className="rounded-xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center">
                {r.i + 1}
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                {t(`pathways.tracks.modules.${r.slug}.name`, r.slug)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {t("pathways.facilitator.detail.modules.col.completed")}
                </p>
                <p className="text-slate-900 dark:text-slate-100 font-semibold">
                  {r.completed}/{enrolled}
                  <span className="text-slate-500 font-normal"> ({r.completionPct}%)</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {t("pathways.facilitator.detail.modules.col.inProgress")}
                </p>
                <p className="text-slate-700 dark:text-slate-300">{r.inProgress}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {t("pathways.facilitator.detail.modules.col.avgScore")}
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {r.avgScore !== null ? `${r.avgScore}%` : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3">{t("pathways.facilitator.detail.modules.col.module")}</th>
              <th className="px-5 py-3">{t("pathways.facilitator.detail.modules.col.completed")}</th>
              <th className="px-5 py-3">{t("pathways.facilitator.detail.modules.col.inProgress")}</th>
              <th className="px-5 py-3">{t("pathways.facilitator.detail.modules.col.avgScore")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {rows.map((r) => (
              <tr key={r.slug}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center">
                      {r.i + 1}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {t(`pathways.tracks.modules.${r.slug}.name`, r.slug)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{r.completed}/{enrolled}</span>
                    <span className="text-xs text-slate-500">({r.completionPct}%)</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{r.inProgress}</td>
                <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                  {r.avgScore !== null ? `${r.avgScore}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ─── Calendar Tab (placeholder) ─────────────────────────────────────────

function CalendarTab({ cohort }: { cohort: Cohort }) {
  const { t } = useTranslation();
  const start = cohort.startDate ? new Date(cohort.startDate) : null;
  const end = cohort.endDate ? new Date(cohort.endDate) : null;

  const sessions: { week: number; date: Date; focus: string }[] = [];
  if (start && end) {
    const focuses = [
      "Cyber Foundations",
      "Digital Safety Sim",
      "Network Basics",
      "Threat Detective",
      "Career Map + Cisco",
      "Capstone Showcase",
    ];
    for (let i = 0; i < 6; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      if (d <= end) {
        sessions.push({ week: i + 1, date: d, focus: focuses[i] });
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900 dark:text-slate-200">
          {t("pathways.facilitator.detail.calendar.title")}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">
          {t("pathways.facilitator.detail.calendar.hint")}
        </p>
      </CardHeader>
      <CardBody>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("pathways.facilitator.detail.calendar.empty")}
          </p>
        ) : (
          <ol className="space-y-3">
            {sessions.map((s) => (
              <li key={s.week} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-700/50">
                <div className="w-12 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{t("pathways.facilitator.detail.calendar.week")}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{s.week}</p>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{s.focus}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">
                    {s.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Notes Tab ─────────────────────────────────────────────────────────

function NotesTab({ cohort, onReload }: { cohort: Cohort; onReload: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const notes = cohort.notes ?? [];

  const auth = { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/pathways/facilitator/cohorts/${cohort.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ text: draft.trim() }),
      });
      setDraft("");
      onReload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <form onSubmit={add} className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {t("pathways.facilitator.detail.notes.addNew")}
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder={t("pathways.facilitator.detail.notes.placeholder") as string}
              className="w-full px-3 py-2 rounded-lg border bg-white border-slate-200 text-sm text-slate-900 placeholder-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !draft.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-sm font-medium"
              >
                <StickyNote className="w-3.5 h-3.5" /> {t("pathways.facilitator.detail.notes.save")}
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <div className="px-5 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
            {t("pathways.facilitator.detail.notes.empty")}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...notes].reverse().map((n, i) => (
            <Card key={i}>
              <CardBody className="space-y-1">
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">{n.text}</p>
                <p className="text-[11px] text-slate-500">
                  {n.author} · {new Date(n.ts).toLocaleString()}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────

function SettingsTab({ cohort, onReload }: { cohort: Cohort; onReload: () => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const auth = { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` };

  const action = async (path: string, key: string, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(key);
    try {
      await fetch(`/api/pathways/facilitator/cohorts/${cohort.id}/${path}`, {
        method: "POST",
        headers: auth,
      });
      onReload();
    } finally {
      setBusy(null);
    }
  };

  const lifecycleButtons: { path: string; key: string; label: string; icon: React.ReactNode; visible: boolean; danger?: boolean }[] = [
    {
      path: "start",
      key: "start",
      label: t("pathways.facilitator.detail.settings.start"),
      icon: <Play className="w-3.5 h-3.5" />,
      visible: cohort.status === "draft" || cohort.status === "paused",
    },
    {
      path: "pause",
      key: "pause",
      label: t("pathways.facilitator.detail.settings.pause"),
      icon: <Pause className="w-3.5 h-3.5" />,
      visible: cohort.status === "active",
    },
    {
      path: "end",
      key: "end",
      label: t("pathways.facilitator.detail.settings.end"),
      icon: <CircleSlash className="w-3.5 h-3.5" />,
      visible: cohort.status === "active" || cohort.status === "paused",
    },
    {
      path: "archive",
      key: "archive",
      label: t("pathways.facilitator.detail.settings.archive"),
      icon: <Archive className="w-3.5 h-3.5" />,
      visible: cohort.status === "ended" || cohort.status === "draft",
      danger: true,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 dark:text-slate-200">
            {t("pathways.facilitator.detail.settings.lifecycleTitle")}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">
            {t("pathways.facilitator.detail.settings.lifecycleHint")}
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {lifecycleButtons.filter((b) => b.visible).map((b) => (
              <button
                key={b.key}
                onClick={() => action(b.path, b.key, b.danger ? (t("pathways.facilitator.detail.settings.confirmArchive") as string) : undefined)}
                disabled={busy === b.key}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  b.danger
                    ? "border bg-white border-red-200 text-red-700 hover:bg-red-50 dark:bg-slate-800 dark:border-red-800/30 dark:text-red-400 dark:hover:bg-red-900/20"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {b.icon} {b.label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 dark:text-slate-200">
            {t("pathways.facilitator.detail.settings.joinCodeTitle")}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">
            {t("pathways.facilitator.detail.settings.joinCodeHint")}
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-3">
            <code className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200 tracking-wider">
              {cohort.joinCode}
            </code>
            <button
              onClick={() => action("regenerate-code", "regen", t("pathways.facilitator.detail.settings.confirmRegen") as string)}
              disabled={busy === "regen"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-sm text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy === "regen" ? "animate-spin" : ""}`} />
              {t("pathways.facilitator.detail.settings.regenerateCode")}
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <h3 className="font-semibold">{t("pathways.facilitator.detail.settings.dataTitle")}</h3>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-700 dark:text-slate-400">
            {t("pathways.facilitator.detail.settings.dataInfo", {
              id: cohort.id.slice(0, 8),
              created: new Date(cohort.createdAt).toLocaleDateString(),
            })}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
