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
    // Ideally fetch specific module, but getModules returns all for now.
    api.getModules().then(mods => {
        const m = mods.find((x: any) => x.slug === slug);
        setModule(m);
    });
  }, [slug]);

  const handleComplete = async (lessonId: string, activityId: string) => {
      try {
          await api.completeActivity({
              moduleSlug: slug!,
              lessonId,
              activityId,
              timeSpentS: 60
          });
          toast({ title: "Activity Completed!", description: "+50 XP" });
          // Check for upgrades?
      } catch (e) {
          toast({ title: "Error", variant: "destructive" });
      }
  };

  if (!module) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{module.title}</h1>
      <div className="space-y-4">
        {module.units?.map((u: any) => (
            <div key={u.id} className="border p-4 rounded">
                <h3 className="font-bold">{u.title}</h3>
                {u.lessons?.map((l: any) => (
                    <div key={l.id} className="ml-4 mt-2">
                        <p>{l.title}</p>
                        <div className="flex gap-2 mt-2">
                             {l.activities?.map((a: any) => (
                                 <Button key={a.id} size="sm" onClick={() => handleComplete(l.id, a.id)}>
                                     Complete: {a.title}
                                 </Button>
                             ))}
                        </div>
                    </div>
                ))}
            </div>
        ))}
      </div>
      <Button className="mt-4" onClick={() => navigate("/avatar")}>Check Avatar Upgrades</Button>
    </div>
  );
}
