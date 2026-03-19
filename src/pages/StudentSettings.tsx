import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { HomeAccessCard } from "@/components/student/HomeAccessCard";

export default function StudentSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const showHomeAccess =
    user?.role === "student" && !user?.homeAccessEnabled;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
        {t("settings.title", { defaultValue: "Settings" })}
      </h1>

      {showHomeAccess && <HomeAccessCard />}

      {user?.homeAccessEnabled && (
        <div className="rounded-xl border bg-green-50 p-4 text-sm text-green-800">
          {t("homeAccess.alreadyEnabled", {
            defaultValue:
              "Home access is enabled. This student can sign in with email and password from home.",
          })}
        </div>
      )}
    </div>
  );
}
