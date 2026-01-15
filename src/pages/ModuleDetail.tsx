// src/pages/ModuleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_VISUAL_TOKENS } from "@/theme/activityVisualTokens";
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
    Promise.all([api.getModule(slug), api.getProgress()])
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

  if (!module) return <div>Loading...</div>;

  const getIcon = (token: any) => {
    if (token.emoji)
      return <span className="text-lg leading-none">{token.emoji}</span>;
    switch (token.iconName) {
      case "BookOpen":
        return <BookOpen className="w-4 h-4" />;
      case "Star":
        return <Star className="w-4 h-4" />;
      case "Zap":
        return <Zap className="w-4 h-4" />;
      case "Check":
        return <Check className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

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
                    const tokenKey = a.kind === "INFO" ? "story" : "game";
                    const token = ACTIVITY_VISUAL_TOKENS[tokenKey];
                    const rewardToken = ACTIVITY_VISUAL_TOKENS["reward"];

                    return (
                      <Card
                        key={a.id}
                        className="p-0 border-0 shadow-none bg-transparent"
                      >
                        <CardContent className="p-0">
                          {isCompleted ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className={`border ${rewardToken.chipClass} hover:bg-opacity-80`}
                                onClick={() =>
                                  navigate(
                                    `/student/modules/${slug}/lessons/${l.id}/activities/${a.id}`,
                                  )
                                }
                              >
                                <div
                                  className={`mr-2 w-6 h-6 rounded-full flex items-center justify-center ${rewardToken.bubbleClass}`}
                                >
                                  <Check className="w-3 h-3" />
                                </div>
                                Done
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-gray-400 h-9 px-2"
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
                              size="sm"
                              variant="outline"
                              className="h-10 bg-white hover:bg-slate-50 border-slate-200"
                              onClick={() =>
                                navigate(
                                  `/student/modules/${slug}/lessons/${l.id}/activities/${a.id}`,
                                )
                              }
                            >
                              <div
                                className={`mr-2 w-6 h-6 rounded-full flex items-center justify-center ${token.bubbleClass}`}
                              >
                                {getIcon(token)}
                              </div>
                              {a.title}
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
