// src/layouts/StudentLayout.tsx
import { ReactNode } from "react";
import BottomNav from "../components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import LanguageToggle from "../components/LanguageToggle";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Initialize i18n if enabled
if (import.meta.env.VITE_ENABLE_I18N === "true" && !i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      lng: localStorage.getItem("preferredLanguage") || "en",
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
      resources: {}, // Resources are loaded dynamically in LanguageToggle
    });
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-blue-50 flex flex-col pb-20">
      <header className="bg-white p-4 border-b flex justify-between items-center sticky top-0 z-40">
        <div
          className="font-bold text-xl text-blue-600 cursor-pointer"
          onClick={() => navigate("/student/dashboard")}
        >
          BrightBoost
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 max-w-6xl">{children}</main>
      <BottomNav />
    </div>
  );
}
