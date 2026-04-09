// src/pages/Modules.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModulesSkeleton } from "@/components/ModulesSkeleton";
import { BookOpen, Lock, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ActivityThumb } from "@/components/shared/ActivityThumb";
import { ImageKey } from "@/theme/activityIllustrations";
import { translateContentName } from "@/utils/localizedContent";
import { getStudentArchetype, canAccessModule, isSet2ModuleSlug, checkSet2Locked } from "@/lib/moduleAccess";
import {
  STEM_SET_1_IDS, STEM_SET_2_IDS, STEM_SET_1_STRANDS, STEM_SET_2_STRANDS,
  HIDDEN_MODULE_SLUGS, countCompletedInSet,
  type StemSet1GameId, type StemSet2GameId,
} from "@/constants/stemSets";
import { useToast } from "@/hooks/use-toast";

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

const SLUG_TO_SET1_ID: Record<string, StemSet1GameId> = {
  "k2-stem-bounce-buds": "bounce-buds",
  "k2-stem-gotcha-gears": "gotcha-gears",
  "k2-stem-rhyme-ride": "rhyme-ride",
  "k2-stem-tank-trek": "tank-trek",
  "k2-stem-quantum-quest": "quantum-quest",
};

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
  "Quantum + AI": "bg-indigo-100 text-indigo-800",
  Capstone: "bg-amber-100 text-amber-800",
};

export default function Modules() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [set2Locked, setSet2Locked] = useState(true);
  const [set1Done, setSet1Done] = useState(0);
  const [set2Done, setSet2Done] = useState(0);
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

        const completedIds: string[] = (progressData?.progress ?? [])
          .filter((p: any) => p.status === "COMPLETED")
          .map((p: any) => String(p.activityId));

        const locked = checkSet2Locked(completedIds);
        setSet2Locked(locked);
        setSet1Done(countCompletedInSet(completedIds, STEM_SET_1_IDS));
        setSet2Done(countCompletedInSet(completedIds, STEM_SET_2_IDS));

        const visible = (data as any[]).filter((m: any) =>
          canAccessModule({ slug: m.slug, archetype }) && !HIDDEN_MODULE_SLUGS.has(m.slug),
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

  const set1Modules = modules.filter((m) => !isSet2ModuleSlug(m.slug));
  const set2Modules = modules.filter((m) => isSet2ModuleSlug(m.slug));

  const handleLockedClick = () => {
    toast({
      title: t("modules.set2LockedToastTitle", { defaultValue: "Set 2 is Locked" }),
      description: t("modules.set2LockedMessage", {
        defaultValue: "Complete Set 1 STEM Games to unlock the next challenge set.",
      }),
    });
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-brightboost-navy mb-2">
        {t("modules.title")}
      </h1>

      {/* ── Set Progression Indicator ── */}
      {!loading && !error && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <SetStep
            label={t("modules.set1Label", { defaultValue: "Set 1" })}
            done={set1Done}
            total={STEM_SET_1_IDS.length}
            status={set1Done >= STEM_SET_1_IDS.length ? "complete" : "active"}
          />
          <div className="w-8 h-0.5 bg-slate-200" />
          <SetStep
            label={t("modules.set2Label", { defaultValue: "Set 2" })}
            done={set2Done}
            total={STEM_SET_2_IDS.length}
            status={set2Locked ? "locked" : set2Done >= STEM_SET_2_IDS.length ? "complete" : "active"}
          />
          <div className="w-8 h-0.5 bg-slate-200" />
          <SetStep
            label={t("modules.set3Label", { defaultValue: "Set 3" })}
            done={0}
            total={5}
            status="coming"
          />
        </div>
      )}

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
          {/* Set 1 */}
          {set1Modules.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-brightboost-navy flex items-center gap-2">
                {t("modules.set1Label", { defaultValue: "Set 1: Foundation" })}
                {set1Done >= STEM_SET_1_IDS.length && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {set1Modules.map((m) => {
                  const set1Id = SLUG_TO_SET1_ID[m.slug];
                  const strand = set1Id ? STEM_SET_1_STRANDS[set1Id] : undefined;
                  return <ModuleCard key={m.id} module={m} navigate={navigate} t={t} strand={strand} />;
                })}
              </div>
            </>
          )}

          {/* Set 2 */}
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
                {!set2Locked && set2Done >= STEM_SET_2_IDS.length && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
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
                      onLockedClick={handleLockedClick}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* Set 3: Coming Soon */}
          <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
              <Lock className="h-5 w-5" />
              <span className="text-lg font-bold">
                {t("modules.set3ComingSoon", { defaultValue: "Set 3: Mastery — Coming Soon" })}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {t("modules.set3ComingSoonDesc", {
                defaultValue: "New challenges are being built. Stay tuned!",
              })}
            </p>
          </div>

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

// ── Set Step Indicator ───────────────────────────────────────────────────

function SetStep({
  label,
  done,
  total,
  status,
}: {
  label: string;
  done: number;
  total: number;
  status: "complete" | "active" | "locked" | "coming";
}) {
  const ring = status === "complete"
    ? "border-green-500 bg-green-50 text-green-700"
    : status === "active"
      ? "border-brightboost-blue bg-blue-50 text-brightboost-blue animate-pulse"
      : "border-slate-200 bg-slate-50 text-slate-400";

  const icon = status === "complete"
    ? <CheckCircle2 className="h-5 w-5" />
    : status === "active"
      ? <span className="text-xs font-extrabold">{done}/{total}</span>
      : status === "coming"
        ? <Clock className="h-4 w-4" />
        : <Lock className="h-4 w-4" />;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${ring}`}>
        {icon}
      </div>
      <div className="text-xs">
        <p className={`font-bold ${status === "locked" || status === "coming" ? "text-slate-400" : "text-slate-700"}`}>
          {label}
        </p>
        <p className="text-slate-400">
          {status === "coming" ? "Soon" : `${done}/${total}`}
        </p>
      </div>
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
  onLockedClick,
}: {
  module: any;
  navigate: (path: string) => void;
  t: (key: string, opts?: any) => string;
  locked?: boolean;
  strand?: string;
  onLockedClick?: () => void;
}) {
  return (
    <Card
      className={`transition flex flex-col h-full border-2 ${
        locked
          ? "border-slate-200 opacity-70 cursor-pointer"
          : "border-transparent hover:border-brightboost-blue/20 hover:shadow-lg"
      }`}
      onClick={locked ? onLockedClick : undefined}
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
          <Button
            variant="outline"
            className="w-full sm:w-auto opacity-60 pointer-events-none"
            tabIndex={-1}
          >
            <Lock className="h-4 w-4 mr-1" />
            {t("modules.locked", { defaultValue: "Locked" })}
          </Button>
        ) : (
          <Button
            onClick={(e) => { e.stopPropagation(); navigate(`/student/modules/${m.slug}`); }}
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
