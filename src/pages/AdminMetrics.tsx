/**
 * Admin scoreboard — /admin/metrics
 *
 * Internal-only view of the headline K-8 funnel numbers. The team reviews
 * these every Friday. Function over form: big numbers, no decorative chrome.
 *
 * Backed by GET /api/admin/metrics (DB-side source of truth). Funnel rates
 * and retention live in PostHog — this page links out for those.
 *
 * Auth: admin role enforced by ProtectedRoute + backend requireRole("admin").
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useApi } from "@/services/api";

interface MetricsResponse {
  asOf: string;
  totalAccounts: number;
  accountsByRole: { teacher: number; student: number };
  totalClasses: number;
  avgStudentsPerClass: number;
  gamesStarted: number;
  gamesCompleted: number;
  completionRate: number;
  signupsLast7Days: number;
  signupsLast30Days: number;
  activeUsersLast7Days: number;
}

interface KpiCard {
  label: string;
  value: string | number;
  target?: string;
  hint?: string;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function AdminMetrics() {
  const api = useApi();
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await api.get("/admin/metrics")) as MetricsResponse;
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading scoreboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-2xl mx-auto rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-800">
            Couldn't load metrics
          </h1>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cards: KpiCard[] = [
    {
      label: "Total accounts",
      value: formatNumber(data.totalAccounts),
      target: "Goal: 1,000",
      hint: `${data.accountsByRole.teacher} teachers · ${data.accountsByRole.student} students`,
    },
    {
      label: "Signups (last 7 days)",
      value: formatNumber(data.signupsLast7Days),
      hint: `${data.signupsLast30Days} in the last 30 days`,
    },
    {
      label: "Active users (last 7d)",
      value: formatNumber(data.activeUsersLast7Days),
      hint: "Distinct students with progress activity",
    },
    {
      label: "Classes created",
      value: formatNumber(data.totalClasses),
      hint: `Avg ${data.avgStudentsPerClass} students/class · target 15+`,
    },
    {
      label: "Games started",
      value: formatNumber(data.gamesStarted),
    },
    {
      label: "Games completed",
      value: formatNumber(data.gamesCompleted),
      hint: `Completion rate ${data.completionRate}% · target >50%`,
    },
  ];

  const asOf = new Date(data.asOf);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Scoreboard — K-8 Funnel
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              DB source of truth · as of {asOf.toLocaleString()}
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-sm text-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                {c.label}
              </p>
              <p className="text-3xl font-bold text-slate-900 font-mono mt-2">
                {c.value}
              </p>
              {c.target && (
                <p className="text-xs text-slate-500 mt-1">{c.target}</p>
              )}
              {c.hint && (
                <p className="text-xs text-slate-600 mt-1">{c.hint}</p>
              )}
            </div>
          ))}
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Look in PostHog for
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Funnels, retention, and per-cohort breakdowns live in PostHog —
            this page intentionally shows DB totals only. See{" "}
            <Link to="/admin/experiments" className="text-blue-700 underline">
              /admin/experiments
            </Link>{" "}
            for active A/B tests.
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-baseline gap-2">
              <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
              <span>
                <strong>Signup → first game</strong>: funnel from
                {" "}<code>account_registered</code> → <code>game_started</code> (target &gt;70%).
              </span>
            </li>
            <li className="flex items-baseline gap-2">
              <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
              <span>
                <strong>Teacher → class created → first student</strong>:
                funnel from <code>account_registered</code> (role=teacher) →
                {" "}<code>class_created</code> → <code>student_joined_class</code>.
              </span>
            </li>
            <li className="flex items-baseline gap-2">
              <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
              <span>
                <strong>Week-2 retention</strong>: weekly retention cohort on
                {" "}<code>login</code> (target &gt;40%).
              </span>
            </li>
            <li className="flex items-baseline gap-2">
              <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
              <span>
                <strong>Most-played games</strong>:{" "}
                <code>game_started</code> broken down by <code>game_id</code>.
              </span>
            </li>
          </ul>
        </section>

        <p className="text-xs text-slate-400">
          Adding new metrics? See <code>docs/analytics.md</code>.
        </p>
      </div>
    </div>
  );
}
