// src/layouts/StudentLayout.tsx
import { ReactNode } from "react";
import BottomNav from "../components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import LanguageToggle from "../components/LanguageToggle";
import { useTranslation } from "react-i18next";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-blue-50 flex flex-col pb-20">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-600 focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-blue-500 font-medium"
      >
        {t("skipToContent")}
      </a>
      <header className="bg-white p-4 border-b flex justify-between items-center sticky top-0 z-40">
        <Link
          to="/student/dashboard"
          className="font-bold text-xl text-blue-600 hover:text-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-md px-1 -ml-1"
        >
          BrightBoost
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main
        id="main-content"
        className="flex-1 container mx-auto p-4 max-w-6xl"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
