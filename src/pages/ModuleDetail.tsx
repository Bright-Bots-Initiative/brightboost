// src/pages/ModuleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{module.title}</h1>
      <p className="text-sm text-gray-600 mb-4">{module.description}</p>
      <div className="space-y-4">
        {module.units?.map((u: any) => (
          <div key={u.id} className="border p-4 rounded">
            <h3 className="font-bold">{u.title}</h3>
            {u.lessons?.map((l: any) => (
              <div key={l.id} className="ml-4 mt-2">
                <p>{l.title}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {l.activities?.map((a: any) => (
                    <Card key={a.id} className="p-0 border-0 shadow-none">
                      <CardContent className="p-0">
                        {completedActivities.has(String(a.id)) ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              onClick={() =>
                                navigate(
                                  `/student/modules/${slug}/lessons/${l.id}/activities/${a.id}`,
                                )
                              }
                            >
                              ✅ Done
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-gray-400 h-8 px-2"
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
                            variant="secondary"
                            onClick={() =>
                              navigate(
                                `/student/modules/${slug}/lessons/${l.id}/activities/${a.id}`,
                              )
                            }
                          >
                            {a.kind === "INFO" ? "📖" : "🎮"} Play: {a.title}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={() => navigate("/avatar")}>
        Check Avatar Upgrades
      </Button>
    </div>
  );
}
