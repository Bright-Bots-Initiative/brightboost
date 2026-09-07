import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { HomeAccessCard } from "@/components/student/HomeAccessCard";

export default function StudentSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
        {t("settings.title", { defaultValue: "Settings" })}
      </h1>

      {/* #872: the card decides what a student may see — setup guidance,
          a classroom-session notice, or the reauthenticated update form. */}
      {user?.role === "student" && <HomeAccessCard />}
    </div>
  );
}
