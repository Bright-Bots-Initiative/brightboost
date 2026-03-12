import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Bell, Globe, RotateCcw } from "lucide-react";
import { resetTutorial } from "@/components/teacher/TeacherTutorial";
import { useAuth } from "../contexts/AuthContext";
import LanguageToggle from "../components/LanguageToggle";

const TeacherSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{t("teacher.settings.title")}</h1>

      <div className="space-y-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              {t("teacher.settings.account")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">{t("teacher.settings.nameLabel")}</p>
                <p className="text-sm text-slate-500">{user?.name || "—"}</p>
              </div>
            </div>
            <div className="border-t pt-3 flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">{t("teacher.settings.emailLabel")}</p>
                <p className="text-sm text-slate-500">{user?.email || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-500" />
              {t("teacher.settings.notifications")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              {t("teacher.settings.notificationsComingSoon")}
            </p>
          </CardContent>
        </Card>

        {/* Tutorial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-slate-500" />
              {t("tutorial.replayTutorial")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => {
                resetTutorial();
                window.location.reload();
              }}
              className="px-4 py-2 text-sm bg-brightboost-blue text-white rounded-lg hover:bg-brightboost-navy transition-colors"
            >
              {t("tutorial.replayTutorial")}
            </button>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-500" />
              {t("teacher.settings.language")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700">
                {t("teacher.settings.displayLanguage")}
              </p>
              <LanguageToggle />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherSettings;
