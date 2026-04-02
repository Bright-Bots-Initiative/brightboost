// src/pages/Modules.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModulesSkeleton } from "@/components/ModulesSkeleton";
import { BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ActivityThumb } from "@/components/shared/ActivityThumb";
import { ImageKey } from "@/theme/activityIllustrations";
import { translateContentName } from "@/utils/localizedContent";
import { getStudentArchetype, canAccessModule } from "@/lib/moduleAccess";

const MODULE_THUMBNAILS: Record<string, ImageKey> = {
  "k2-stem-sequencing": "type_game",
  "k2-stem-rhyme-ride": "type_game",
  "k2-stem-bounce-buds": "type_game",
  "k2-stem-gotcha-gears": "type_game",
  "k2-stem-tank-trek": "type_game",
  "k2-stem-quantum-quest": "type_game",
  "stem-1-intro": "type_game",
};

const MODULE_ORDER: Record<string, number> = {
  "k2-stem-sequencing": 1,
  "k2-stem-rhyme-ride": 2,
  "k2-stem-bounce-buds": 3,
  "k2-stem-gotcha-gears": 4,
  "k2-stem-tank-trek": 5,
  "k2-stem-quantum-quest": 6,
  // Specialization modules come after public content
  "stem-1-intro": 20,
};

export default function Modules() {
  const { t } = useTranslation();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getModules({ level: "K-2" }), api.getAvatar()])
      .then(([data, avatarData]) => {
        const archetype = getStudentArchetype(avatarData);

        // Hide specialization-gated modules entirely until unlocked
        const visible = (data as any[]).filter((m: any) =>
          canAccessModule({ slug: m.slug, archetype }),
        );

        visible.sort(
          (a: any, b: any) =>
            (MODULE_ORDER[a.slug] ?? 999) - (MODULE_ORDER[b.slug] ?? 999) ||
            a.title.localeCompare(b.title),
        );
        setModules(visible);
        setError(null);
      })
      .catch(() => {
        setError(t("modules.loadError"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-brightboost-navy mb-6">
        {t("modules.title")}
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <ModulesSkeleton />
      ) : modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => (
            <Card
              key={m.id}
              className="transition flex flex-col h-full border-2 border-transparent hover:border-brightboost-blue/20 hover:shadow-lg"
            >
              <div className="p-4 pb-0 relative">
                <ActivityThumb
                  imageKey={MODULE_THUMBNAILS[m.slug] || "module_sequencing"}
                  variant="module"
                  className="h-24 w-full"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-brightboost-navy">
                  {translateContentName(m.title)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-gray-500 mb-6">
                  {translateContentName(m.description ?? m.subtitle ?? "...")}
                </p>
                <Button
                  onClick={() => navigate(`/student/modules/${m.slug}`)}
                  className="w-full sm:w-auto"
                  aria-label={`${t("modules.startLearning")} ${translateContentName(m.title)}`}
                >
                  {t("modules.startLearning")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !error && (
          <div className="text-center py-12 px-4 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <BookOpen size={32} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("modules.noModules")}
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {t("modules.noModulesDesc")}
            </p>
          </div>
        )
      )}
    </div>
  );
}
