// src/pages/ModuleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ActivityThumb } from "@/components/shared/ActivityThumb";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Star, Zap, Check } from "lucide-react";

export default function ModuleDetail() {
  const { slug } = useParams();
  const [module, setModule] = useState<any>(null);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(
    new Set(),
  );
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
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
      .catch((e) => {
        toast({
          title: "Error",
          description: e?.message || "Failed to load module.",
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
        aria-label="Loading module details"
      >
        <span className="sr-only">Loading module details...</span>
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
        {module.title}
      </h1>
      <p className="text-sm text-gray-600 mb-6">{module.description}</p>
      <div className="space-y-6">
        {module.units?.map((u: any) => (
          <div
            key={u.id}
            className="border p-6 rounded-xl bg-white shadow-sm space-y-4"
          >
            <h3 className="font-bold text-lg text-brightboost-navy border-b pb-2">
              {u.title}
            </h3>
            {u.lessons?.map((l: any) => (
              <div key={l.id} className="ml-2 mt-2 space-y-2">
                <p className="font-medium text-slate-700">{l.title}</p>
                <div className="flex gap-3 flex-wrap">
                  {l.activities?.map((a: any) => {
                    const isCompleted = completedActivities.has(String(a.id));
                    const imageKey =
                      a.kind === "INFO" ? "type_story" : "type_game";
                    const variant = a.kind === "INFO" ? "story" : "game";

                    return (
                      <Card
                        key={a.id}
                        className="p-0 border-0 shadow-none bg-transparent"
                      >
                        <CardContent className="p-0">
                          {isCompleted ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                className="h-14 justify-start px-2 border-brightboost-green/30 bg-brightboost-green/5 text-brightboost-navy hover:bg-brightboost-green/10"
                                onClick={() =>
                                  navigate(
                                    `/student/modules/${slug}/lessons/${l.id}/activities/${a.id}`,
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
                                    {a.title}
                                  </span>
                                  <span className="text-[10px] bg-white/50 px-1.5 rounded text-green-700 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Done
                                  </span>
                                </div>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-gray-400 h-14 px-2"
                                aria-label={`Replay ${a.title}`}
                                onClick={() =>
                                  navigate(
                                    `/student/modules/${slug}/lessons/${l.id}/activities/${a.id}`,
                                  )
                                }
                              >
                                Replay
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              className="h-14 justify-start px-2 bg-white hover:bg-slate-50 border-slate-200"
                              onClick={() =>
                                navigate(
                                  `/student/modules/${slug}/lessons/${l.id}/activities/${a.id}`,
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
                                  {a.title}
                                </span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                                  {variant}
                                </span>
                              </div>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <Button className="mt-8" onClick={() => navigate("/avatar")}>
        Check Avatar Upgrades
      </Button>
    </div>
  );
}
