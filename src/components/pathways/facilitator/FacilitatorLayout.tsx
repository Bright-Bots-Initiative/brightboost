/**
 * FacilitatorLayout — operational admin shell inside PathwaysLayout.
 *
 * Visual identity is intentionally distinct from the student experience:
 *  - left sidebar nav (vs student bottom nav / colorful cards)
 *  - role badge in header + cohort context selector
 *  - data-dense, table-forward content rather than tile-forward
 *  - neutral palette accents (slate + indigo) instead of track-color fills
 *
 * Mounts as a nested route under /pathways/facilitator so PathwaysLayout
 * still supplies the .dark wrapper and the parent shell.
 */
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Compass,
  GraduationCap,
  BarChart3,
  BookOpen,
  Settings as SettingsIcon,
  Shield,
  ChevronDown,
} from "lucide-react";

const ACTIVE_COHORT_KEY = "bb_facilitator_active_cohort";

interface CohortOption {
  id: string;
  name: string;
  status: string;
}

export default function FacilitatorLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [activeCohortId, setActiveCohortId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_COHORT_KEY);
    } catch {
      return null;
    }
  });
  const [cohortMenuOpen, setCohortMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/pathways/cohorts", {
      headers: { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const arr: CohortOption[] = Array.isArray(data)
          ? data.map((c: { id: string; name: string; status: string }) => ({ id: c.id, name: c.name, status: c.status }))
          : [];
        setCohorts(arr);
        if (!activeCohortId && arr.length > 0) {
          // Default to the first active cohort
          const firstActive = arr.find((c) => c.status === "active") ?? arr[0];
          setActiveCohortId(firstActive.id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (activeCohortId) localStorage.setItem(ACTIVE_COHORT_KEY, activeCohortId);
    } catch {
      /* ignore */
    }
  }, [activeCohortId]);

  const activeCohort = cohorts.find((c) => c.id === activeCohortId);

  return (
    <div className="flex flex-col gap-6 -mt-2">
      {/* Header bar with role + cohort selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {user?.name ?? t("pathways.facilitator.adminTitle")}
          </span>
          <span className="text-slate-400 dark:text-slate-600">•</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300">
            <Shield className="w-3 h-3" /> {t("pathways.facilitator.roleBadge")}
          </span>
        </div>

        {/* Active cohort selector */}
        {cohorts.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setCohortMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white border-slate-200 text-sm text-slate-800 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span className="text-slate-500 dark:text-slate-500 text-xs uppercase tracking-wider">
                {t("pathways.facilitator.activeCohort")}
              </span>
              <span className="font-medium">{activeCohort?.name ?? t("pathways.facilitator.selectCohort")}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${cohortMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {cohortMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 min-w-[260px] rounded-lg border bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-lg overflow-hidden">
                {cohorts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCohortId(c.id);
                      setCohortMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      c.id === activeCohortId
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
                        : "text-slate-800 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <span>{c.name}</span>
                    <StatusPill status={c.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left sidebar nav */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-6 rounded-xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 p-2 space-y-0.5">
            <SidebarItem to="/pathways/facilitator" end icon={<LayoutDashboard className="w-4 h-4" />} label={t("pathways.facilitator.nav.dashboard")} />
            <SidebarItem to="/pathways/facilitator/cohorts" icon={<Users className="w-4 h-4" />} label={t("pathways.facilitator.nav.cohorts")} />
            <SidebarItem to="/pathways/facilitator/tracks" icon={<Compass className="w-4 h-4" />} label={t("pathways.facilitator.nav.tracks")} />
            <SidebarItem to="/pathways/facilitator/learners" icon={<GraduationCap className="w-4 h-4" />} label={t("pathways.facilitator.nav.learners")} />
            <SidebarItem to="/pathways/facilitator/reports" icon={<BarChart3 className="w-4 h-4" />} label={t("pathways.facilitator.nav.reports")} />
            <SidebarItem to="/pathways/facilitator/resources" icon={<BookOpen className="w-4 h-4" />} label={t("pathways.facilitator.nav.resources")} />
            <SidebarItem to="/pathways/facilitator/settings" icon={<SettingsIcon className="w-4 h-4" />} label={t("pathways.facilitator.nav.settings")} />
          </nav>
        </aside>

        {/* Mobile horizontal nav */}
        <nav className="lg:hidden -mx-1 px-1 flex gap-1 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
          <MobileSidebarItem to="/pathways/facilitator" end label={t("pathways.facilitator.nav.dashboard")} />
          <MobileSidebarItem to="/pathways/facilitator/cohorts" label={t("pathways.facilitator.nav.cohorts")} />
          <MobileSidebarItem to="/pathways/facilitator/tracks" label={t("pathways.facilitator.nav.tracks")} />
          <MobileSidebarItem to="/pathways/facilitator/learners" label={t("pathways.facilitator.nav.learners")} />
          <MobileSidebarItem to="/pathways/facilitator/reports" label={t("pathways.facilitator.nav.reports")} />
          <MobileSidebarItem to="/pathways/facilitator/resources" label={t("pathways.facilitator.nav.resources")} />
          <MobileSidebarItem to="/pathways/facilitator/settings" label={t("pathways.facilitator.nav.settings")} />
        </nav>

        {/* Page content */}
        <div className="flex-1 min-w-0">
          <Outlet context={{ activeCohortId, cohorts, refreshCohorts: () => {
            fetch("/api/pathways/cohorts", {
              headers: { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` },
            })
              .then((r) => r.json())
              .then((data) => Array.isArray(data) && setCohorts(data.map((c: { id: string; name: string; status: string }) => ({ id: c.id, name: c.name, status: c.status }))))
              .catch(() => {});
          } }} />
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function MobileSidebarItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    ended: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    archived: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${styles[status] ?? styles.draft}`}>
      {status}
    </span>
  );
}
