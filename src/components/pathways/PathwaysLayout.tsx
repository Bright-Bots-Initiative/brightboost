/**
 * Pathways Layout — mature shell for secondary-age (14-17) users.
 *
 * Theme: toggles a `.dark` class on an OUTER wrapper div so Tailwind's
 * class strategy can resolve `dark:` variants on the descendants below.
 * (Tailwind's selector is `.dark .dark\\:foo`, which requires `.dark` on
 * an ancestor — putting both on the same element doesn't work.) The
 * wrapper is Pathways-scoped, so K-8 surfaces stay unaffected.
 * Preference is persisted under `bb_pathways_theme`.
 *
 * i18n: every label is keyed under `pathways.layout.*` and falls back
 * to English via i18n.ts fallbackLng.
 */
import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Compass, User, Users, LogOut, Moon, Sun, BookOpen } from "lucide-react";
import LanguageToggle from "@/components/LanguageToggle";
import { CelebrationProvider } from "./gamification/CelebrationContext";

const THEME_KEY = "bb_pathways_theme";

function readStoredTheme(): "dark" | "light" {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export default function PathwaysLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [theme, setTheme] = useState<"dark" | "light">(() => readStoredTheme());
  const isDark = theme === "dark";

  // Persist theme preference whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* localStorage unavailable — preference will not persist */
    }
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isFacilitator = user?.role === "teacher";

  return (
    <CelebrationProvider>
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen flex bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <nav className="hidden md:flex flex-col w-56 border-r shrink-0 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
            {t("pathways.layout.eyebrow")}
          </p>
          <p className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
            {t("pathways.layout.brand")}
          </p>
        </div>

        <div className="flex-1 py-4 space-y-1 px-2">
          <SidebarLink to="/pathways" icon={<Home className="w-4 h-4" />} label={t("pathways.layout.nav.home")} end />
          <SidebarLink to="/pathways/tracks" icon={<Compass className="w-4 h-4" />} label={t("pathways.layout.nav.tracks")} />
          <SidebarLink to="/pathways/profile" icon={<User className="w-4 h-4" />} label={t("pathways.layout.nav.profile")} />
          {isFacilitator && (
            <>
              <SidebarLink to="/pathways/facilitator" icon={<Users className="w-4 h-4" />} label={t("pathways.layout.nav.dashboard")} />
              <SidebarLink to="/pathways/facilitator/resources" icon={<BookOpen className="w-4 h-4" />} label={t("pathways.layout.nav.resources")} />
            </>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="px-1">
            <LanguageToggle variant={isDark ? "dark" : "light"} />
          </div>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            {isDark ? t("pathways.common.lightMode") : t("pathways.common.darkMode")}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <LogOut className="w-3 h-3" /> {t("pathways.common.signOut")}
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <p className="font-bold text-sm bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
            {t("pathways.layout.brand")}
          </p>
          <div className="flex items-center gap-3">
            <LanguageToggle variant={isDark ? "dark" : "light"} />
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-1.5"
              aria-label={isDark ? t("pathways.common.lightMode") : t("pathways.common.darkMode")}
            >
              {isDark ? <Sun className="w-4 h-4 text-slate-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 flex items-center justify-around py-2 border-t bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <MobileNavLink to="/pathways" icon={<Home className="w-5 h-5" />} label={t("pathways.layout.nav.home")} end />
          <MobileNavLink to="/pathways/tracks" icon={<Compass className="w-5 h-5" />} label={t("pathways.layout.nav.tracks")} />
          <MobileNavLink to="/pathways/profile" icon={<User className="w-5 h-5" />} label={t("pathways.layout.nav.profile")} />
          {isFacilitator && (
            <MobileNavLink to="/pathways/facilitator" icon={<Users className="w-5 h-5" />} label={t("pathways.layout.nav.manage")} />
          )}
        </div>
      </main>
      </div>
    </div>
    </CelebrationProvider>
  );
}

function SidebarLink({
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
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500 dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-500"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

function MobileNavLink({
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
        `flex flex-col items-center gap-0.5 text-[10px] font-medium ${
          isActive
            ? "text-indigo-700 dark:text-indigo-300"
            : "text-slate-500 dark:text-slate-400"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
