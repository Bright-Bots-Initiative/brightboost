// src/pages/ModuleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ActivityThumb } from "@/components/shared/ActivityThumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";
import {
  getStudentArchetype,
  canAccessModule,
  isSpecializationModuleSlug,
} from "@/lib/moduleAccess";
import { translateContentName } from "@/utils/localizedContent";

export default function ModuleDetail() {
  const { slug } = useParams();
  const [module, setModule] = useState<any>(null);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(
    new Set(),
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!slug) return;

    // Guard: if the module requires specialization, check archetype first
    if (isSpecializationModuleSlug(slug)) {
      api.getAvatar().then((avatarData) => {
        const arch = getStudentArchetype(avatarData);
        if (!canAccessModule({ slug, archetype: arch })) {
          toast({
            title: t("modules.detail.locked"),
            description: t("modules.detail.unlockPrompt"),
            variant: "destructive",
          });
          navigate("/student/avatar", { replace: true });
        }
      });
    }

    Promise.all([
      api.getModule(slug, { structureOnly: true }),
      // ⚡ Bolt Optimization: Exclude user data to save DB call
      api.getProgress({ excludeUser: true }),
    ])
      .then(([m, p]) => {
        setModule(m);
        if (p?.progress) {
          const completed = new Set<string>(
            p.progress
              .filter((item: any) => item.status === "COMPLETED")
              .map((item: any) => String(item.activityId)),
          );
          setCompletedActivities(completed);
        }
      })
      .catch(() => {
        toast({
          title: t("common.oops", { defaultValue: "Oops!" }),
          description: t("modules.detail.loadError"),
          variant: "destructive",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]); // avoid accidental reruns

  if (!module) {
    return (
      <div
        className="p-4 max-w-4xl mx-auto space-y-6"
        role="status"
        aria-busy="true"
        aria-label={t("modules.detail.loadingAria")}
      >
        <span className="sr-only">{t("modules.detail.loading")}</span>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="space-y-6">
          <div className="border p-6 rounded-xl bg-white shadow-sm space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-3">
                <Skeleton className="h-14 w-40" />
                <Skeleton className="h-14 w-40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-brightboost-navy">
        {translateContentName(module.title)}
      </h1>
      <p className="text-sm text-gray-600 mb-6">{translateContentName(module.description)}</p>
      <div className="space-y-3">
        {(() => {
          // Flatten units → lessons → activities into a single numbered list
          const allActivities: { a: any; lessonId: string }[] = [];
          module.units?.forEach((u: any) =>
            u.lessons?.forEach((l: any) =>
              l.activities?.forEach((a: any) =>
                allActivities.push({ a, lessonId: l.id }),
              ),
            ),
          );
          return allActivities.map(({ a, lessonId }, idx) => {
            const isCompleted = completedActivities.has(String(a.id));
            const imageKey = a.kind === "INFO" ? "type_story" : "type_game";
            const variant = a.kind === "INFO" ? "story" : "game";
            const label =
              a.kind === "INFO"
                ? t("modules.detail.story")
                : t("modules.detail.game");

            return (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-white border rounded-xl p-3 shadow-sm"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brightboost-blue/10 text-brightboost-navy font-bold text-sm flex items-center justify-center">
                  {idx + 1}
                </div>
                {isCompleted ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-grow h-14 justify-start px-2 border-brightboost-green/30 bg-brightboost-green/5 text-brightboost-navy hover:bg-brightboost-green/10"
                      onClick={() =>
                        navigate(
                          `/student/modules/${slug}/lessons/${lessonId}/activities/${a.id}`,
                        )
                      }
                    >
                      <ActivityThumb
                        imageKey={imageKey}
                        variant={variant}
                        className="h-10 w-10 mr-3"
                      />
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-semibold">
                          {translateContentName(a.title)}
                        </span>
                        <span className="text-[10px] bg-white/50 px-1.5 rounded text-green-700 flex items-center gap-1">
                          <Check className="h-3 w-3" /> {t("modules.detail.done")}
                        </span>
                      </div>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-gray-400 h-14 px-2"
                      aria-label={`${t("modules.detail.replay")} ${translateContentName(a.title)}`}
                      onClick={() =>
                        navigate(
                          `/student/modules/${slug}/lessons/${lessonId}/activities/${a.id}`,
                        )
                      }
                    >
                      {t("modules.detail.replay")}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-grow h-14 justify-start px-2 bg-white hover:bg-slate-50 border-slate-200"
                    onClick={() =>
                      navigate(
                        `/student/modules/${slug}/lessons/${lessonId}/activities/${a.id}`,
                      )
                    }
                  >
                    <ActivityThumb
                      imageKey={imageKey}
                      variant={variant}
                      className="h-10 w-10 mr-3"
                    />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold text-brightboost-navy">
                        {translateContentName(a.title)}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                  </Button>
                )}
              </div>
            );
          });
        })()}
      </div>
      <Button className="mt-8" onClick={() => navigate("/avatar")}>
        {t("modules.detail.checkAvatarUpgrades")}
      </Button>
    </div>
  );
}
