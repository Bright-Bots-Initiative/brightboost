// src/components/TeacherDashboard/TeacherNavbar.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import BrightBoostRobot from "../BrightBoostRobot";
import LanguageToggle from "../LanguageToggle";
import { LogOut, User, Edit, ChevronDown } from "lucide-react";

interface TeacherNavbarProps {
  userName: string;
  avatarUrl?: string | null;
  onLogout: () => void;
  onProfileClick: () => void;
  onEditProfileClick: () => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const TeacherNavbar: React.FC<TeacherNavbarProps> = ({
  userName,
  avatarUrl,
  onLogout,
  onProfileClick,
  onEditProfileClick,
}) => {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav
      className="bg-brightboost-navy text-white shadow-lg"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left side - Logo */}
          <div className="flex items-center gap-3">
            <BrightBoostRobot size="sm" className="w-10 h-10" />
            <h1 className="text-xl font-bold tracking-wide">{t("teacher.brightBoost")}</h1>
          </div>

          {/* Right side - Language toggle + User menu */}
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-brightboost-blue/20 transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-light"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                aria-label={`User menu for ${userName}`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-brightboost-light rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-brightboost-navy">
                      {getInitials(userName)}
                    </span>
                  </div>
                )}
                <span className="font-medium hidden sm:inline">{t("teacher.welcome", { name: userName })}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown menu */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                  role="menu"
                  aria-labelledby="user-menu-button"
                >
                  <button
                    onClick={() => {
                      onProfileClick();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors focus:outline-none focus:bg-gray-50"
                    role="menuitem"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    {t("teacher.viewProfile")}
                  </button>
                  <button
                    onClick={() => {
                      onEditProfileClick();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors focus:outline-none focus:bg-gray-50"
                    role="menuitem"
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                    {t("teacher.editProfile")}
                  </button>
                  <hr className="my-1 border-gray-100" role="separator" />
                  <button
                    onClick={() => {
                      onLogout();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors focus:outline-none focus:bg-red-50"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("teacher.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TeacherNavbar;
