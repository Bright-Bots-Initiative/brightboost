// src/pages/Modules.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModulesSkeleton } from "@/components/ModulesSkeleton";
import { BookOpen, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ActivityThumb } from "@/components/shared/ActivityThumb";
import { ImageKey } from "@/theme/activityIllustrations";
import { translateContentName } from "@/utils/localizedContent";
import { getStudentArchetype, canAccessModule, isSet2ModuleSlug, checkSet2Locked } from "@/lib/moduleAccess";
import { STEM_SET_2_STRANDS, type StemSet2GameId } from "@/constants/stemSets";

const MODULE_THUMBNAILS: Record<string, ImageKey> = {
  "k2-stem-sequencing": "type_game",
  "k2-stem-rhyme-ride": "type_game",
  "k2-stem-bounce-buds": "type_game",
  "k2-stem-gotcha-gears": "type_game",
  "k2-stem-tank-trek": "type_game",
  "k2-stem-quantum-quest": "type_game",
  "k2-stem-maze-maps": "type_game",
  "k2-stem-move-measure": "type_game",
  "k2-stem-sky-shield": "type_game",
  "k2-stem-fast-lane": "type_game",
  "k2-stem-qualify-tune-race": "type_game",
  "stem-1-intro": "type_game",
};

const MODULE_ORDER: Record<string, number> = {
  // Set 1
  "k2-stem-sequencing": 1,
  "k2-stem-rhyme-ride": 2,
  "k2-stem-bounce-buds": 3,
  "k2-stem-gotcha-gears": 4,
  "k2-stem-tank-trek": 5,
  "k2-stem-quantum-quest": 6,
  // Set 2
  "k2-stem-maze-maps": 10,
  "k2-stem-move-measure": 11,
  "k2-stem-sky-shield": 12,
  "k2-stem-fast-lane": 13,
  "k2-stem-qualify-tune-race": 14,
  // Specialization modules come after public content
  "stem-1-intro": 30,
};

/** Map module slug → Set 2 activity ID for strand badge lookup. */
const SLUG_TO_SET2_ID: Record<string, StemSet2GameId> = {
  "k2-stem-maze-maps": "maze-maps",
  "k2-stem-move-measure": "move-measure",
  "k2-stem-sky-shield": "sky-shield",
  "k2-stem-fast-lane": "fast-lane",
  "k2-stem-qualify-tune-race": "qualify-tune-race",
};

const STRAND_COLORS: Record<string, string> = {
  AI: "bg-blue-100 text-blue-800",
  Biotech: "bg-green-100 text-green-800",
  Quantum: "bg-purple-100 text-purple-800",
  "AI + Biotech": "bg-teal-100 text-teal-800",
  Capstone: "bg-amber-100 text-amber-800",
};

export default function Modules() {
  const { t } = useTranslation();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [set2Locked, setSet2Locked] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getModules({ level: "K-2" }),
      api.getAvatar(),
      api.getProgress().catch(() => ({ progress: [] })),
    ])
      .then(([data, avatarData, progressData]) => {
        const archetype = getStudentArchetype(avatarData);

        // Compute completed activity IDs for Set gating
        const completedIds: string[] = (progressData?.progress ?? [])
          .filter((p: any) => p.status === "COMPLETED")
          .map((p: any) => String(p.activityId));

        const locked = checkSet2Locked(completedIds);
        setSet2Locked(locked);

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

  // Split into Set 1 and Set 2
  const set1Modules = modules.filter((m) => !isSet2ModuleSlug(m.slug));
  const set2Modules = modules.filter((m) => isSet2ModuleSlug(m.slug));

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
      ) : (
        <>
          {/* Set 1: Foundation */}
          {set1Modules.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-brightboost-navy flex items-center gap-2">
                {t("modules.set1Label", { defaultValue: "Set 1: Foundation" })}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {set1Modules.map((m) => (
                  <ModuleCard key={m.id} module={m} navigate={navigate} t={t} />
                ))}
              </div>
            </>
          )}

          {/* Set 2: Exploration */}
          {set2Modules.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-brightboost-navy flex items-center gap-2 mt-8">
                {t("modules.set2Label", { defaultValue: "Set 2: Exploration" })}
                {set2Locked && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <Lock className="h-3 w-3" />
                    {t("modules.locked", { defaultValue: "Locked" })}
                  </span>
                )}
              </h2>

              {set2Locked && (
                <p className="text-sm text-slate-500 -mt-2 mb-4">
                  {t("modules.set2LockedMessage", {
                    defaultValue: "Complete Set 1 STEM Games to unlock the next challenge set.",
                  })}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {set2Modules.map((m) => {
                  const set2Id = SLUG_TO_SET2_ID[m.slug];
                  const strand = set2Id ? STEM_SET_2_STRANDS[set2Id] : undefined;
                  return (
                    <ModuleCard
                      key={m.id}
                      module={m}
                      navigate={navigate}
                      t={t}
                      locked={set2Locked}
                      strand={strand}
                    />
                  );
                })}
              </div>
            </>
          )}

          {set1Modules.length === 0 && set2Modules.length === 0 && !error && (
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
          )}
        </>
      )}
    </div>
  );
}

// ── Module Card Component ─────────────────────────────────────────────────

function ModuleCard({
  module: m,
  navigate,
  t,
  locked = false,
  strand,
}: {
  module: any;
  navigate: (path: string) => void;
  t: (key: string, opts?: any) => string;
  locked?: boolean;
  strand?: string;
}) {
  return (
    <Card
      className={`transition flex flex-col h-full border-2 ${
        locked
          ? "border-slate-200 opacity-70"
          : "border-transparent hover:border-brightboost-blue/20 hover:shadow-lg"
      }`}
    >
      <div className="p-4 pb-0 relative">
        <ActivityThumb
          imageKey={MODULE_THUMBNAILS[m.slug] || "module_sequencing"}
          variant="module"
          className={`h-24 w-full ${locked ? "grayscale" : ""}`}
        />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/80 rounded-full p-2">
              <Lock className="h-6 w-6 text-slate-400" />
            </div>
          </div>
        )}
      </div>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl text-brightboost-navy">
            {translateContentName(m.title)}
          </CardTitle>
        </div>
        {strand && (
          <span
            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${
              STRAND_COLORS[strand] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {strand}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <p className="text-sm text-gray-500 mb-6">
          {translateContentName(m.description ?? m.subtitle ?? "...")}
        </p>
        {locked ? (
          <Button disabled className="w-full sm:w-auto opacity-50">
            <Lock className="h-4 w-4 mr-1" />
            {t("modules.locked", { defaultValue: "Locked" })}
          </Button>
        ) : (
          <Button
            onClick={() => navigate(`/student/modules/${m.slug}`)}
            className="w-full sm:w-auto"
            aria-label={`${t("modules.startLearning")} ${translateContentName(m.title)}`}
          >
            {t("modules.startLearning")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
