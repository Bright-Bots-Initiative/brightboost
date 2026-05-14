/**
 * Cohorts list — full list of facilitator's cohorts with filter/search.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, Users } from "lucide-react";
import Card from "../shared/Card";
import { StatusPill } from "../FacilitatorLayout";

interface Cohort {
  id: string;
  name: string;
  band: string;
  sitePartner: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
  _count?: { enrollments: number };
}

const STATUS_OPTIONS = ["all", "draft", "active", "paused", "ended", "archived"];
const BAND_OPTIONS = ["all", "explorer", "launch", "mixed"];

export default function CohortsList() {
  const { t } = useTranslation();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [bandFilter, setBandFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/pathways/cohorts", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => setCohorts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return cohorts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (bandFilter !== "all" && c.band !== bandFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${c.name} ${c.sitePartner ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cohorts, statusFilter, bandFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("pathways.facilitator.cohorts.title")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t("pathways.facilitator.cohorts.subtitle")}
          </p>
        </div>
        <Link
          to="/pathways/facilitator/cohorts/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> {t("pathways.facilitator.cohorts.newCohort")}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("pathways.facilitator.cohorts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-sm rounded-lg border bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          aria-label={t("pathways.facilitator.cohorts.filterStatus")}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? t("pathways.facilitator.cohorts.filterStatusAll") : t(`pathways.facilitator.status.${s}`, s)}
            </option>
          ))}
        </select>
        <select
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          aria-label={t("pathways.facilitator.cohorts.filterBand")}
        >
          {BAND_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b === "all" ? t("pathways.facilitator.cohorts.filterBandAll") : t(`pathways.facilitator.band.${b}`, b)}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 dark:text-slate-500 ml-auto">
          {t("pathways.facilitator.cohorts.resultCount", { count: filtered.length })}
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
              {cohorts.length === 0
                ? t("pathways.facilitator.cohorts.emptyAll")
                : t("pathways.facilitator.cohorts.emptyFiltered")}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <th className="px-5 py-3">{t("pathways.facilitator.cohorts.col.name")}</th>
                  <th className="px-5 py-3">{t("pathways.facilitator.cohorts.col.site")}</th>
                  <th className="px-5 py-3">{t("pathways.facilitator.cohorts.col.band")}</th>
                  <th className="px-5 py-3">{t("pathways.facilitator.cohorts.col.status")}</th>
                  <th className="px-5 py-3">{t("pathways.facilitator.cohorts.col.enrolled")}</th>
                  <th className="px-5 py-3">{t("pathways.facilitator.cohorts.col.dates")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to={`/pathways/facilitator/cohorts/${c.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-400">{c.sitePartner ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-400 capitalize">{c.band}</td>
                    <td className="px-5 py-3"><StatusPill status={c.status} /></td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">
                      {c._count?.enrollments ?? 0}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-500">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}
                      {" → "}
                      {c.endDate ? new Date(c.endDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
