/**
 * Learners — cross-cohort master roster with search/filter.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Users } from "lucide-react";
import Card from "../shared/Card";

interface Learner {
  id: string;
  name: string | null;
  email: string | null;
  ageBand: string | null;
  cohorts: { id: string; name: string; status: string }[];
  completedCount: number;
  totalModules: number;
  lastActive: string | null;
  status: string;
}

export default function Learners() {
  const { t } = useTranslation();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");

  useEffect(() => {
    fetch("/api/pathways/facilitator/learners", {
      headers: { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` },
    })
      .then((r) => r.json())
      .then((data) => setLearners(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allCohorts = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const l of learners) for (const c of l.cohorts) seen.set(c.id, { id: c.id, name: c.name });
    return Array.from(seen.values());
  }, [learners]);

  const filtered = useMemo(() => {
    return learners.filter((l) => {
      if (bandFilter !== "all" && l.ageBand !== bandFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (cohortFilter !== "all" && !l.cohorts.some((c) => c.id === cohortFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${l.name ?? ""} ${l.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [learners, search, bandFilter, statusFilter, cohortFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("pathways.facilitator.learners.title")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t("pathways.facilitator.learners.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("pathways.facilitator.learners.searchPlaceholder") as string}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-sm rounded-lg border bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
        >
          <option value="all">{t("pathways.facilitator.learners.filterCohortAll")}</option>
          {allCohorts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
        >
          <option value="all">{t("pathways.facilitator.cohorts.filterBandAll")}</option>
          <option value="explorer">{t("pathways.facilitator.band.explorer")}</option>
          <option value="launch">{t("pathways.facilitator.band.launch")}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
        >
          <option value="all">{t("pathways.facilitator.learners.filterStatusAll")}</option>
          <option value="active">{t("pathways.facilitator.learners.statusActive")}</option>
          <option value="completed">{t("pathways.facilitator.learners.statusCompleted")}</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto">
          {t("pathways.facilitator.learners.resultCount", { count: filtered.length })}
        </span>
      </div>

      {loading ? (
        <Card>
          <div className="px-5 py-12 text-center text-slate-600 dark:text-slate-400">
            {t("pathways.common.loading")}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="px-5 py-12 text-center">
            <Users className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {learners.length === 0
                ? t("pathways.facilitator.learners.emptyAll")
                : t("pathways.facilitator.learners.emptyFiltered")}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">{t("pathways.facilitator.learners.col.name")}</th>
                <th className="px-5 py-3">{t("pathways.facilitator.learners.col.cohorts")}</th>
                <th className="px-5 py-3">{t("pathways.facilitator.learners.col.band")}</th>
                <th className="px-5 py-3">{t("pathways.facilitator.learners.col.completion")}</th>
                <th className="px-5 py-3">{t("pathways.facilitator.learners.col.lastActive")}</th>
                <th className="px-5 py-3">{t("pathways.facilitator.learners.col.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <Link
                      to={`/pathways/facilitator/learners/${l.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      {l.name ?? l.email}
                    </Link>
                    <p className="text-xs text-slate-600 dark:text-slate-500">{l.email}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-700 dark:text-slate-400">
                    {l.cohorts.map((c) => c.name).join(", ")}
                  </td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-400 capitalize">{l.ageBand ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-900 dark:text-slate-100 font-medium">
                    {l.completedCount}<span className="text-slate-500 font-normal">/{l.totalModules || 7}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-500">
                    {l.lastActive ? new Date(l.lastActive).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        l.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : l.status === "completed"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
