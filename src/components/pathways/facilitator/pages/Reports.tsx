/**
 * Reports — funder/partner-ready reporting interface.
 * Four pre-built report types + a stats dashboard. CSV export available.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BookOpen,
  Award,
  TrendingUp,
  Download,
  Users,
  CheckCircle2,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import Card, { CardBody, CardHeader, StatTile } from "../shared/Card";

type ReportKey = "weekly" | "outcomes" | "engagement" | "cohort";

interface WeeklyReport {
  windowDays: number;
  modulesCompleted: number;
  newEnrollments: number;
  inactiveLearners: { id: string; name: string | null }[];
  capstonesInProgress: number;
  recentActivity: Array<{ moduleSlug: string; user?: { name: string | null }; score: number | null; completedAt: string | null; createdAt: string }>;
}

interface OutcomesReport {
  totalCohorts: number;
  activeCohorts: number;
  endedCohorts: number;
  totalEnrolled: number;
  modulesCompleted: number;
  capstonesProduced: number;
  externalCourseworkStarted: number;
  averageScore: number;
}

interface EngagementReport {
  totalLearners: number;
  activeLast7Days: number;
  activeLast30Days: number;
  dailyActivity: { date: string; count: number }[];
}

export default function Reports() {
  const { t } = useTranslation();
  const [active, setActive] = useState<ReportKey>("weekly");
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomesReport | null>(null);
  const [engagement, setEngagement] = useState<EngagementReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    Promise.all([
      fetch("/api/pathways/facilitator/reports/weekly", { headers: auth }).then((r) => r.json()),
      fetch("/api/pathways/facilitator/reports/outcomes", { headers: auth }).then((r) => r.json()),
      fetch("/api/pathways/facilitator/reports/engagement", { headers: auth }).then((r) => r.json()),
    ])
      .then(([w, o, e]) => {
        setWeekly(w);
        setOutcomes(o);
        setEngagement(e);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const reports: { key: ReportKey; label: string; icon: React.ReactNode; description: string }[] = [
    {
      key: "weekly",
      label: t("pathways.facilitator.reports.types.weekly.label"),
      icon: <Activity className="w-4 h-4" />,
      description: t("pathways.facilitator.reports.types.weekly.description"),
    },
    {
      key: "outcomes",
      label: t("pathways.facilitator.reports.types.outcomes.label"),
      icon: <Award className="w-4 h-4" />,
      description: t("pathways.facilitator.reports.types.outcomes.description"),
    },
    {
      key: "engagement",
      label: t("pathways.facilitator.reports.types.engagement.label"),
      icon: <TrendingUp className="w-4 h-4" />,
      description: t("pathways.facilitator.reports.types.engagement.description"),
    },
    {
      key: "cohort",
      label: t("pathways.facilitator.reports.types.cohort.label"),
      icon: <BookOpen className="w-4 h-4" />,
      description: t("pathways.facilitator.reports.types.cohort.description"),
    },
  ];

  const exportWeekly = () => {
    if (!weekly) return;
    const rows = [
      ["Window", `${weekly.windowDays} days`],
      ["Modules Completed", weekly.modulesCompleted.toString()],
      ["New Enrollments", weekly.newEnrollments.toString()],
      ["Inactive Learners", weekly.inactiveLearners.map((l) => l.name).join("; ")],
      ["Capstones In Progress", weekly.capstonesInProgress.toString()],
    ];
    downloadCsv("weekly_activity_report.csv", rows);
  };

  const exportOutcomes = () => {
    if (!outcomes) return;
    const rows = Object.entries(outcomes).map(([k, v]) => [k, String(v)]);
    downloadCsv("outcomes_report.csv", rows);
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-600 dark:text-slate-400">{t("pathways.common.loading")}</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("pathways.facilitator.reports.title")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t("pathways.facilitator.reports.subtitle")}
        </p>
      </div>

      {/* Stats summary across all reports */}
      {outcomes && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label={t("pathways.facilitator.reports.summary.totalLearners")}
            value={outcomes.totalEnrolled}
            icon={<Users className="w-4 h-4" />}
          />
          <StatTile
            label={t("pathways.facilitator.reports.summary.modulesCompleted")}
            value={outcomes.modulesCompleted}
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <StatTile
            label={t("pathways.facilitator.reports.summary.capstones")}
            value={outcomes.capstonesProduced}
            icon={<Sparkles className="w-4 h-4" />}
          />
          <StatTile
            label={t("pathways.facilitator.reports.summary.avgScore")}
            value={`${outcomes.averageScore}%`}
            icon={<GraduationCap className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Report type selector */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {reports.map((r) => {
          const isActive = active === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                isActive
                  ? "border-indigo-600 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-600/10"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400"}>
                  {r.icon}
                </span>
                <p className={`text-sm font-semibold ${isActive ? "text-indigo-800 dark:text-indigo-200" : "text-slate-900 dark:text-slate-100"}`}>
                  {r.label}
                </p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">{r.description}</p>
            </button>
          );
        })}
      </div>

      {/* Selected report body */}
      {active === "weekly" && weekly && <WeeklyView w={weekly} onExport={exportWeekly} />}
      {active === "outcomes" && outcomes && <OutcomesView o={outcomes} onExport={exportOutcomes} />}
      {active === "engagement" && engagement && <EngagementView e={engagement} />}
      {active === "cohort" && <CohortReportNote />}
    </div>
  );
}

function WeeklyView({ w, onExport }: { w: WeeklyReport; onExport: () => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-200">
            {t("pathways.facilitator.reports.types.weekly.label")}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {t("pathways.facilitator.reports.windowDays", { days: w.windowDays })}
          </p>
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 text-xs font-medium"
        >
          <Download className="w-3.5 h-3.5" /> {t("pathways.common.exportCsv")}
        </button>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <KV label={t("pathways.facilitator.dashboard.modulesCompleted")} value={w.modulesCompleted} />
          <KV label={t("pathways.facilitator.dashboard.newEnrollments")} value={w.newEnrollments} />
          <KV label={t("pathways.facilitator.dashboard.needsFollowUp")} value={w.inactiveLearners.length} />
          <KV label={t("pathways.facilitator.dashboard.capstonesInProgress")} value={w.capstonesInProgress} />
        </div>
        {w.inactiveLearners.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-medium mb-1">
              {t("pathways.facilitator.reports.inactiveList")}
            </p>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
              {w.inactiveLearners.slice(0, 10).map((l) => (
                <li key={l.id}>· {l.name ?? l.id.slice(0, 8)}</li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function OutcomesView({ o, onExport }: { o: OutcomesReport; onExport: () => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-200">
          {t("pathways.facilitator.reports.types.outcomes.label")}
        </h3>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 text-xs font-medium"
        >
          <Download className="w-3.5 h-3.5" /> {t("pathways.common.exportCsv")}
        </button>
      </CardHeader>
      <CardBody>
        <div className="grid sm:grid-cols-2 gap-3">
          <KV label={t("pathways.facilitator.reports.outcomes.totalCohorts")} value={o.totalCohorts} />
          <KV label={t("pathways.facilitator.reports.outcomes.activeCohorts")} value={o.activeCohorts} />
          <KV label={t("pathways.facilitator.reports.outcomes.endedCohorts")} value={o.endedCohorts} />
          <KV label={t("pathways.facilitator.reports.outcomes.totalEnrolled")} value={o.totalEnrolled} />
          <KV label={t("pathways.facilitator.reports.outcomes.modulesCompleted")} value={o.modulesCompleted} />
          <KV label={t("pathways.facilitator.reports.outcomes.capstones")} value={o.capstonesProduced} />
          <KV label={t("pathways.facilitator.reports.outcomes.cisco")} value={o.externalCourseworkStarted} />
          <KV label={t("pathways.facilitator.reports.outcomes.avgScore")} value={`${o.averageScore}%`} />
        </div>
      </CardBody>
    </Card>
  );
}

function EngagementView({ e }: { e: EngagementReport }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...e.dailyActivity.map((d) => d.count));
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900 dark:text-slate-200">
          {t("pathways.facilitator.reports.types.engagement.label")}
        </h3>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <KV label={t("pathways.facilitator.reports.engagement.totalLearners")} value={e.totalLearners} />
          <KV label={t("pathways.facilitator.reports.engagement.active7")} value={e.activeLast7Days} />
          <KV label={t("pathways.facilitator.reports.engagement.active30")} value={e.activeLast30Days} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-medium mb-2">
            {t("pathways.facilitator.reports.engagement.dailyActivity")}
          </p>
          <div className="flex items-end gap-px h-24">
            {e.dailyActivity.map((d) => (
              <div
                key={d.date}
                className="flex-1 bg-indigo-200 dark:bg-indigo-600/40 rounded-t hover:bg-indigo-400 dark:hover:bg-indigo-500 transition-colors"
                style={{ height: `${(d.count / max) * 100}%` }}
                title={`${d.date}: ${d.count}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{e.dailyActivity[0]?.date}</span>
            <span>{e.dailyActivity[e.dailyActivity.length - 1]?.date}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function CohortReportNote() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-slate-700 dark:text-slate-400">
          {t("pathways.facilitator.reports.cohortReportHint")}
        </p>
      </CardBody>
    </Card>
  );
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-700/50">
      <p className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
    </div>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
