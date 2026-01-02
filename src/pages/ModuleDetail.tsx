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
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    api
      .getModule(slug)
      .then((m) => setModule(m))
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
