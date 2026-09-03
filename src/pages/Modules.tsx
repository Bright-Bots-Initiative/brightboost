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
import {
  getStudentArchetype,
  canAccessModule,
  isSet2ModuleSlug,
  isSet3ModuleSlug,
  checkSet2Locked,
  checkSet3Locked,
} from "@/lib/moduleAccess";
import {
  resolveGuidedChoice,
  type GuidedChoiceResult,
} from "@/lib/guidedChoice";
import {
  buildModuleSlugPriority,
  scanForNextActivity,
  type ContinueScanResult,
} from "@/lib/continueScan";
import { GuidedChoicePanel } from "@/components/modules/GuidedChoicePanel";
import {
  STEM_SET_1_IDS,
  STEM_SET_2_IDS,
  STEM_SET_3_IDS,
  STEM_SET_1_STRANDS,
  STEM_SET_2_STRANDS,
  STEM_SET_3_STRANDS,
  HIDDEN_MODULE_SLUGS,
  countCompletedInSet,
  type StemSet1GameId,
  type StemSet2GameId,
  type StemSet3GameId,
} from "@/constants/stemSets";
import { useToast } from "@/hooks/use-toast";

const MODULE_THUMBNAILS: Record<string, ImageKey> = {
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
  "k2-stem-track-maker": "type_game",
  "stem-1-intro": "type_game",
};

const MODULE_ORDER: Record<string, number> = {
  // Set 1 (Foundation canonical public order)
  "k2-stem-bounce-buds": 1,
  "k2-stem-gotcha-gears": 2,
  "k2-stem-rhyme-ride": 3,
  "k2-stem-tank-trek": 4,
  "k2-stem-quantum-quest": 5,
  // Set 2
  "k2-stem-maze-maps": 10,
  "k2-stem-move-measure": 11,
  "k2-stem-sky-shield": 12,
  "k2-stem-fast-lane": 13,
  "k2-stem-qualify-tune-race": 14,
  // Set 3
  "k2-stem-track-maker": 20,
  // Legacy / hidden
  "k2-stem-sequencing": 90,
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

const SLUG_TO_SET3_ID: Record<string, StemSet3GameId> = {
  "k2-stem-track-maker": "track-maker",
};

/**
 * The band guided choice resolves against on this page.
 *
 * This page requests `api.getModules({ level: "K-2" })`, and
 * `gradeBandAffectsAccess("K-2")` is `false` — K-2 content is open to every
 * band by product design — so the student's real band cannot change the
 * verdict for any record this page holds, and fetching it would be a request
 * whose answer provably cannot matter (the same reasoning `useModuleAccess`
 * applies when it declines to wait on `/student/courses`).
 *
 * If a band-discriminating record ever did reach this list, `k2` refuses it,
 * which is the fail-closed direction for a surface that has not resolved the
 * band. That refusal only withholds it from the *choice layer*: the module
 * still renders as an ordinary card in its set section below, so nothing
 * becomes unreachable and no learner-facing "made for bigger kids" copy is
 * shown for what would really be an unresolved input (accessibility contract
 * §6). Widening this page's catalog request means resolving the band first.
 */
const GUIDED_CHOICE_BAND = "k2" as const;

/**
 * Seed parts for the surprise pick, read from what the page already has.
 *
 * The user id keeps two children from being shown the same "surprise", and
 * the date bucket is deliberately a day, not a timestamp: the pick must
 * survive a re-render and a refresh, or the disclosure a learner is reading
 * could change under them.
 */
function readSeedUserId(): string {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return String(parsed.id);
    }
  } catch {
    // fall through to anonymous
  }
  return "anonymous";
}

function todayBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const [set3Locked, setSet3Locked] = useState(true);
  const [set1Done, setSet1Done] = useState(0);
  const [set2Done, setSet2Done] = useState(0);
  const [set3Done, setSet3Done] = useState(0);
  const [guided, setGuided] = useState<GuidedChoiceResult | null>(null);
  // Frozen once per mount so the surprise pick cannot shift under a re-render.
  const [seedUserId] = useState(readSeedUserId);
  const [seedDateBucket] = useState(todayBucket);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      let data: any[];
      let avatarData: unknown;
      let progressData: { progress?: any[] };
      try {
        [data, avatarData, progressData] = await Promise.all([
          api.getModules({ level: "K-2" }),
          api.getAvatar(),
          api.getProgress().catch(() => ({ progress: [] })),
        ]);
      } catch {
        if (!cancelled) {
          setError(t("modules.loadError"));
          setLoading(false);
        }
        return;
      }
      if (cancelled) return;

      const archetype = getStudentArchetype(avatarData);

      const completedIds: string[] = (progressData?.progress ?? [])
        .filter((p: any) => p.status === "COMPLETED")
        .map((p: any) => String(p.activityId));

      const locked = checkSet2Locked(completedIds);
      setSet2Locked(locked);
      setSet3Locked(checkSet3Locked(completedIds));
      setSet1Done(countCompletedInSet(completedIds, STEM_SET_1_IDS));
      setSet2Done(countCompletedInSet(completedIds, STEM_SET_2_IDS));
      setSet3Done(countCompletedInSet(completedIds, STEM_SET_3_IDS));

      const all = Array.isArray(data) ? data : [];
      const byCanonicalOrder = (a: any, b: any) =>
        (MODULE_ORDER[a.slug] ?? 999) - (MODULE_ORDER[b.slug] ?? 999) ||
        String(a.title ?? "").localeCompare(String(b.title ?? ""));

      // The set sections keep exactly the filter and order they had (#697's
      // territory — this change adds a choice layer above them, it does not
      // redesign the page).
      const visible = all
        .filter(
          (m: any) =>
            canAccessModule({ slug: m.slug, archetype }) &&
            !HIDDEN_MODULE_SLUGS.has(m.slug),
        )
        .sort(byCanonicalOrder);
      setModules(visible);
      setError(null);
      setLoading(false);

      // ── Guided choice (#842) ──────────────────────────────────────────
      // Runs after the page is already rendered, so the set sections never
      // wait on the Continue scan.
      const progressList = Array.isArray(progressData?.progress)
        ? progressData.progress
        : [];

      // A teacher assignment lifts a set lock for its target (access policy
      // E). Absent or unreachable assignments fall back to the progression
      // answer, which is the truthful state for a student with none.
      let sessions: { moduleSlug?: string | null }[] = [];
      try {
        const raw = await api.getStudentAssignments();
        if (Array.isArray(raw)) sessions = raw;
      } catch {
        // Not enrolled, or the endpoint is unavailable — that is fine.
      }
      if (cancelled) return;
      const assignedModuleSlugs = new Set(
        sessions
          .map((s) => s?.moduleSlug)
          .filter((s): s is string => typeof s === "string" && !!s),
      );

      // The catalog list, ordered but NOT pre-filtered: the resolver reports a
      // reason for every refusal, which is the point of having one.
      const candidates = [...all].sort(byCanonicalOrder);

      // #842 requires the Modules page's Continue to be the *same* target the
      // student dashboard computes, so it runs the same canonical scan with
      // the same access policy rather than a second opinion.
      const accessOnly = (slug: string) =>
        resolveGuidedChoice({
          modules: candidates.filter((m: any) => m.slug === slug),
          hiddenSlugs: HIDDEN_MODULE_SLUGS,
          completedActivityIds: completedIds,
          archetype,
          gradeBand: GUIDED_CHOICE_BAND,
          assignedModuleSlugs,
          scan: null,
        }).continueTarget !== null;

      let scan: ContinueScanResult | null = null;
      try {
        scan = await scanForNextActivity({
          slugPriority: buildModuleSlugPriority(all, progressList),
          progress: progressList,
          loadModule: (slug) => api.getModule(slug, { structureOnly: true }),
          isAllowed: accessOnly,
          isCancelled: () => cancelled,
          onLoadError: (slug, e) =>
            console.warn(`Failed to fetch module ${slug}:`, e),
        });
      } catch {
        // A failed scan is an infrastructure problem, not a learner outcome
        // (principle 9): guided choice falls back to the first allowed module
        // rather than showing an error where a next step belongs.
        scan = null;
      }
      if (cancelled) return;

      setGuided(
        resolveGuidedChoice({
          modules: candidates,
          hiddenSlugs: HIDDEN_MODULE_SLUGS,
          completedActivityIds: completedIds,
          archetype,
          gradeBand: GUIDED_CHOICE_BAND,
          assignedModuleSlugs,
          scan,
        }),
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set1Modules = modules.filter(
    (m) => !isSet2ModuleSlug(m.slug) && !isSet3ModuleSlug(m.slug),
  );
  const set2Modules = modules.filter((m) => isSet2ModuleSlug(m.slug));
  const set3Modules = modules.filter((m) => isSet3ModuleSlug(m.slug));

  const handleLockedClick = () => {
    toast({
      title: t("modules.set2LockedToastTitle", {
        defaultValue: "Set 2 is Locked",
      }),
      description: t("modules.set2LockedMessage", {
        defaultValue:
          "Complete Set 1 STEM Games to unlock the next challenge set.",
      }),
    });
  };

  const handleSet3LockedClick = () => {
    toast({
      title: t("modules.set3LockedToastTitle", {
        defaultValue: "Set 3 is Locked",
      }),
      description: t("modules.set3LockedMessage", {
        defaultValue: "Complete Set 2 STEM Games to unlock the mastery set.",
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
            status={
              set2Locked
                ? "locked"
                : set2Done >= STEM_SET_2_IDS.length
                  ? "complete"
                  : "active"
            }
          />
          <div className="w-8 h-0.5 bg-slate-200" />
          <SetStep
            label={t("modules.set3Label", { defaultValue: "Set 3" })}
            done={set3Done}
            total={STEM_SET_3_IDS.length}
            status={
              set3Modules.length === 0
                ? "coming"
                : set3Locked
                  ? "locked"
                  : set3Done >= STEM_SET_3_IDS.length
                    ? "complete"
                    : "active"
            }
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

      {/* ── Guided choice (#842): Continue, alternatives, revisit, surprise ── */}
      {!loading && !error && guided && (
        <GuidedChoicePanel
          result={guided}
          navigate={navigate}
          seedUserId={seedUserId}
          seedDateBucket={seedDateBucket}
        />
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
                  const strand = set1Id
                    ? STEM_SET_1_STRANDS[set1Id]
                    : undefined;
                  return (
                    <ModuleCard
                      key={m.id}
                      module={m}
                      navigate={navigate}
                      t={t}
                      strand={strand}
                    />
                  );
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
                    defaultValue:
                      "Complete Set 1 STEM Games to unlock the next challenge set.",
                  })}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {set2Modules.map((m) => {
                  const set2Id = SLUG_TO_SET2_ID[m.slug];
                  const strand = set2Id
                    ? STEM_SET_2_STRANDS[set2Id]
                    : undefined;
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

          {/* Set 3 */}
          {set3Modules.length > 0 ? (
            <>
              <h2 className="text-lg font-bold text-brightboost-navy flex items-center gap-2 mt-8">
                {t("modules.set3Label", { defaultValue: "Set 3: Mastery" })}
                {set3Locked && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <Lock className="h-3 w-3" />
                    {t("modules.locked", { defaultValue: "Locked" })}
                  </span>
                )}
                {!set3Locked && set3Done >= STEM_SET_3_IDS.length && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </h2>

              {set3Locked && (
                <p className="text-sm text-slate-500 -mt-2 mb-4">
                  {t("modules.set3LockedMessage", {
                    defaultValue:
                      "Complete Set 2 STEM Games to unlock the mastery set.",
                  })}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {set3Modules.map((m) => {
                  const set3Id = SLUG_TO_SET3_ID[m.slug];
                  const strand = set3Id
                    ? STEM_SET_3_STRANDS[set3Id]
                    : undefined;
                  return (
                    <ModuleCard
                      key={m.id}
                      module={m}
                      navigate={navigate}
                      t={t}
                      locked={set3Locked}
                      strand={strand}
                      onLockedClick={handleSet3LockedClick}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
                <Lock className="h-5 w-5" />
                <span className="text-lg font-bold">
                  {t("modules.set3ComingSoon", {
                    defaultValue: "Set 3: Mastery — Coming Soon",
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {t("modules.set3ComingSoonDesc", {
                  defaultValue: "New challenges are being built. Stay tuned!",
                })}
              </p>
            </div>
          )}

          {set1Modules.length === 0 &&
            set2Modules.length === 0 &&
            set3Modules.length === 0 &&
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
  const ring =
    status === "complete"
      ? "border-green-500 bg-green-50 text-green-700"
      : status === "active"
        ? "border-brightboost-blue bg-blue-50 text-brightboost-blue animate-pulse"
        : "border-slate-200 bg-slate-50 text-slate-400";

  const icon =
    status === "complete" ? (
      <CheckCircle2 className="h-5 w-5" />
    ) : status === "active" ? (
      <span className="text-xs font-extrabold">
        {done}/{total}
      </span>
    ) : status === "coming" ? (
      <Clock className="h-4 w-4" />
    ) : (
      <Lock className="h-4 w-4" />
    );

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${ring}`}
      >
        {icon}
      </div>
      <div className="text-xs">
        <p
          className={`font-bold ${status === "locked" || status === "coming" ? "text-slate-400" : "text-slate-700"}`}
        >
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
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/student/modules/${m.slug}`);
            }}
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
