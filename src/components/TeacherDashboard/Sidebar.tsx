import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Users,
  School,
  FolderOpen,
  GraduationCap,
  BarChart3,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { i18nKey: "teacher.nav.lessons", path: "/teacher/dashboard", icon: BookOpen },
  { i18nKey: "teacher.nav.students", path: "/teacher/students", icon: Users },
  { i18nKey: "teacher.nav.classes", path: "/teacher/classes", icon: School },
  { i18nKey: "teacher.nav.resources", path: "/teacher/resources", icon: FolderOpen },
  { i18nKey: "teacher.nav.pdHub", path: "/teacher/pd", icon: GraduationCap },
  { i18nKey: "teacher.nav.impact", path: "/teacher/impact", icon: BarChart3 },
  { i18nKey: "teacher.nav.showcase", path: "/teacher/showcase", icon: Trophy },
  { i18nKey: "teacher.nav.settings", path: "/teacher/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}) => {
  const { t } = useTranslation();

  const sidebarContent = (
    <div
      className={`h-screen bg-gray-800 text-white p-4 space-y-2 fixed top-0 left-0 shadow-lg z-40 flex flex-col transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-[60px]" : "w-64"
      } hidden md:flex`}
    >
      {/* Header */}
      <div className="mb-4 text-center">
        {!collapsed && (
          <h2 className="text-lg font-semibold whitespace-nowrap overflow-hidden">
            {t("teacher.admin")}
          </h2>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ i18nKey, path, icon: Icon }) => {
          const label = t(i18nKey);
          return (
            <NavLink
              key={i18nKey}
              to={path}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 py-3 rounded-lg transition duration-200 ease-in-out text-sm font-medium
                hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  collapsed ? "px-0 justify-center" : "px-4"
                } ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-300"
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden">{label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition duration-200"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>
    </div>
  );

  const mobileSidebar = (
    <>
      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      {/* Drawer */}
      <div
        className={`h-screen bg-gray-800 text-white p-4 space-y-2 fixed top-0 left-0 shadow-lg z-50 flex flex-col w-64 transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 text-center">
          <h2 className="text-lg font-semibold">{t("teacher.admin")}</h2>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ i18nKey, path, icon: Icon }) => {
            const label = t(i18nKey);
            return (
              <NavLink
                key={i18nKey}
                to={path}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3 px-4 rounded-lg transition duration-200 ease-in-out text-sm font-medium
                  hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-300"
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );

  return (
    <>
      {sidebarContent}
      {mobileSidebar}
    </>
  );
};

export default Sidebar;
