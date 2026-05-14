/**
 * Pathways Profile — learner profile + portfolio. i18n + light/dark.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Clock, Star } from "lucide-react";

export default function PathwaysProfile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/pathways/student/milestones", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => setMilestones(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const completed = milestones.filter((m) => m.status === "completed");
  const inProgress = milestones.filter((m) => m.status === "in_progress");
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((s, m) => s + (m.score ?? 0), 0) / completed.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-2xl border bg-white border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center text-2xl text-indigo-700 dark:text-indigo-300 font-bold">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {user?.name ?? t("pathways.profile.learner")}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatBlock
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconColor="text-emerald-600 dark:text-emerald-400"
          value={completed.length}
          label={t("pathways.profile.completed")}
        />
        <StatBlock
          icon={<Clock className="w-5 h-5" />}
          iconColor="text-indigo-600 dark:text-indigo-400"
          value={inProgress.length}
          label={t("pathways.profile.inProgress")}
        />
        <StatBlock
          icon={<Star className="w-5 h-5" />}
          iconColor="text-amber-600 dark:text-amber-400"
          value={`${avgScore}%`}
          label={t("pathways.profile.avgScore")}
        />
      </div>

      {/* Completed Modules */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-3">
            {t("pathways.profile.completedModules")}
          </h2>
          <div className="space-y-2">
            {completed.map((m) => {
              const moduleName = t(
                `pathways.tracks.modules.${m.moduleSlug}.name`,
                m.moduleSlug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              ) as string;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/20"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-800 dark:text-slate-200">{moduleName}</p>
                    <p className="text-[10px] text-slate-500">
                      {m.trackSlug} {m.score ? t("pathways.profile.scoreFmt", { score: m.score }) : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconColor: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50 text-center shadow-sm">
      <div className={`flex justify-center mb-1 ${iconColor}`}>{icon}</div>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  );
}
