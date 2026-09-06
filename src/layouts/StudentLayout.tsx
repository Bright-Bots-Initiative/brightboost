import "@/components/specialty/specialty.css";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useLocation } from "react-router-dom";
import { SPECIALTY_ICONS } from "@/components/specialty/specialtyIcons";
// src/layouts/StudentLayout.tsx
import { ReactNode } from "react";
import BottomNav from "../components/BottomNav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { useGradeBand } from "@/hooks/useGradeBand";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import LanguageToggle from "../components/LanguageToggle";
import FeedbackFab from "../components/FeedbackFab";
import { useTranslation } from "react-i18next";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const gradeBand = useGradeBand();
  const { data } = useSpecialty();
  const location = useLocation();
  const specialty = data?.unlocked ? data.specialty : null;
  const SpecialtyIcon = specialty ? SPECIALTY_ICONS[specialty] : null;
  const gradeBandLabel =
    gradeBand === "g3_5"
      ? t("studentLayout.bandG35")
      : t("studentLayout.bandK2");

  return (
    <div
      data-specialty={specialty ?? undefined}
      className={`min-h-screen bg-gradient-to-b from-sky-100 to-blue-50 flex flex-col pb-20 ${specialty ? "specialty-student" : ""}`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-600 focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-blue-500 font-medium"
      >
        {t("skipToContent")}
      </a>

      <header className="bg-white p-4 border-b flex flex-wrap gap-3 justify-between items-center sticky top-0 z-40">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/student/dashboard"
            className="specialty-brand font-bold text-xl text-blue-600 hover:text-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-md px-1 -ml-1"
          >
            BrightBoost
          </Link>

          {specialty && SpecialtyIcon && (
            <Link to="/student/advanced" className="specialty-shell-badge">
              <SpecialtyIcon size={17} />
              <span>{t(`specialty.tracks.${specialty}.name`)}</span>
            </Link>
          )}
          <Badge
            variant="secondary"
            className="whitespace-nowrap bg-blue-100 text-blue-700"
          >
            {gradeBandLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <LanguageToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 gap-1.5"
            aria-label={t("common.logOut")}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">
              {t("common.logOut")}
            </span>
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        className="flex-1 container mx-auto p-4 max-w-6xl"
      >
        {data?.unlocked &&
          !data.specialty &&
          !location.pathname.startsWith("/student/specialty") &&
          !location.pathname.startsWith("/student/advanced") && (
            <aside className="specialty-invitation">
              <div>
                <strong>{t("specialty.inviteTitle")}</strong>
                <p>{t("specialty.inviteDescription")}</p>
              </div>
              <Link className={buttonVariants()} to="/student/specialty">
                {t("specialty.inviteAction")}
              </Link>
            </aside>
          )}
        {children}
      </main>

      <BottomNav />
      <FeedbackFab />
    </div>
  );
}
