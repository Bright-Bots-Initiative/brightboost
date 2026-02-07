import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "../contexts/AuthContext";
import XPProgressWidget from "@/components/StudentDashboard/XPProgress";
import {
  Lock,
  Flame,
  BookOpen,
  Star,
  Zap,
  Trophy,
  Sparkles,
  CalendarDays,
  Target,
  Check,
} from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_VISUAL_TOKENS } from "@/theme/activityVisualTokens";
import { cn } from "@/lib/utils";
import {
  computeStreakFromProgress,
  ProgressLike,
  StreakStats,
} from "@/lib/streakFromProgress";
import StreakMeter from "@/components/ui/StreakMeter";

type NextActivity = {
  moduleSlug: string;
  moduleTitle: string;
  unitId: string;
  unitTitle: string;
  lessonId: string;
  lessonTitle: string;
  activityId: string;
  activityTitle: string;
  kind: "INFO" | "INTERACT";
  orderKey: string;
};

type CompletedModule = {
  slug: string;
  title: string;
};

function sortNum(n: any, fallback = 9999) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function flattenModule(module: any): NextActivity[] {
  const out: NextActivity[] = [];
  const units = (module?.units || [])
    .slice()
    .sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
  for (const u of units) {
    const lessons = (u?.lessons || [])
      .slice()
      .sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
    for (const l of lessons) {
      const acts = (l?.activities || [])
        .slice()
        .sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
      for (const a of acts) {
        out.push({
          moduleSlug: module.slug,
          moduleTitle: module.title,
          unitId: String(u.id),
          unitTitle: u.title,
          lessonId: String(l.id),
          lessonTitle: l.title,
          activityId: String(a.id),
          activityTitle: a.title,
          kind: a.kind,
          orderKey: `${sortNum(u.order)}.${sortNum(l.order)}.${sortNum(a.order)}`,
        });
      }
    }
  }
  return out;
}

/**
 * Build priority-ordered list of module slugs:
 * - First: modules with recent progress, sorted by most recent
 * - Then: remaining modules in catalog order
 */
function buildModuleSlugPriority(
  modules: any[],
  progress: (ProgressLike & { moduleSlug?: string })[],
): string[] {
  // Get slugs with progress, sorted by most recent
  const progressBySlug = new Map<string, Date>();
  for (const p of progress) {
    if (!p.moduleSlug || !p.updatedAt) continue;
    const date = new Date(p.updatedAt);
    if (isNaN(date.getTime())) continue;
    const existing = progressBySlug.get(p.moduleSlug);
    if (!existing || date > existing) {
      progressBySlug.set(p.moduleSlug, date);
    }
  }

  const progressedSlugs = Array.from(progressBySlug.entries())
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .map(([slug]) => slug);

  // Add remaining modules in catalog order
  const allSlugs = modules.map((m) => m.slug);
  const remainingSlugs = allSlugs.filter((s) => !progressBySlug.has(s));

  return [...progressedSlugs, ...remainingSlugs];
}

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [avatar, setAvatar] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progressList, setProgressList] = useState<any[]>([]);
  const [upNext, setUpNext] = useState<NextActivity[]>([]);
  const [nextOne, setNextOne] = useState<NextActivity | null>(null);
  const [completedModules, setCompletedModules] = useState<CompletedModule[]>(
    [],
  );
  const [completedActivitiesCount, setCompletedActivitiesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Compute streak from progress
  const streakStats: StreakStats = useMemo(() => {
    return computeStreakFromProgress(progressList);
  }, [progressList]);

  const currentLevel = useMemo(() => {
    const lvl = Number(avatar?.level);
    return Number.isFinite(lvl) && lvl > 0 ? lvl : 1;
  }, [avatar?.level]);

  const currentXp = useMemo(() => {
    const xp = Number(avatar?.xp);
    return Number.isFinite(xp) && xp >= 0 ? xp : 0;
  }, [avatar?.xp]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [av, mods, prog] = await Promise.all([
          api.getAvatar(),
          api.getModules(),
          api.getProgress({ excludeUser: true }),
        ]);
        if (cancelled) return;

        setAvatar(av);
        setModules(Array.isArray(mods) ? mods : []);

        const modsList = Array.isArray(mods) ? mods : [];
        const progList = Array.isArray(prog?.progress) ? prog.progress : [];
        setProgressList(progList);

        // Count completed activities
        const completedCount = progList.filter(
          (p: any) => p?.status === "COMPLETED",
        ).length;
        setCompletedActivitiesCount(completedCount);

        // Build priority order for module scanning
        const slugPriority = buildModuleSlugPriority(modsList, progList);

        if (slugPriority.length === 0) {
          setNextOne(null);
          setUpNext([]);
          setCompletedModules([]);
          return;
        }

        // Scan modules in priority order to find first incomplete activity
        let foundNextOne: NextActivity | null = null;
        let foundUpNext: NextActivity[] = [];
        const completedMods: CompletedModule[] = [];

        for (const slug of slugPriority) {
          try {
            const deep = await api.getModule(slug, { structureOnly: true });
            if (cancelled) return;

            const ordered = flattenModule(deep);
            if (ordered.length === 0) continue;

            const completedSet = new Set(
              progList
                .filter(
                  (p: any) =>
                    p?.moduleSlug === slug && p?.status === "COMPLETED",
                )
                .map((p: any) => String(p.activityId)),
            );

            const firstIncomplete = ordered.find(
              (x) => !completedSet.has(String(x.activityId)),
            );

            if (firstIncomplete) {
              // Found the next activity to do
              foundNextOne = firstIncomplete;
              const startIdx = ordered.findIndex(
                (x) => x.activityId === firstIncomplete.activityId,
              );
              // Get activities AFTER nextOne (not including it)
              foundUpNext = ordered.slice(startIdx + 1, startIdx + 4);
              break;
            } else {
              // Module is complete
              completedMods.push({ slug, title: deep.title || slug });
            }
          } catch (e) {
            // Skip module on fetch failure
            console.warn(`Failed to fetch module ${slug}:`, e);
          }
        }

        setNextOne(foundNextOne);
        setUpNext(foundUpNext);
        setCompletedModules(completedMods);
      } catch (e) {
        console.error(e);
        toast({
          title: t("dashboard.unavailableTitle"),
          description: t("dashboard.unavailableDesc"),
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [toast, t]);

  const goToNext = () => {
    if (!nextOne) return navigate("/student/modules");
    navigate(
      `/student/modules/${nextOne.moduleSlug}/lessons/${nextOne.lessonId}/activities/${nextOne.activityId}`,
    );
  };

  // Achievement definitions
  const achievements = useMemo(() => {
    return [
      {
        id: "firstSteps",
        icon: Sparkles,
        target: 1,
        current: completedActivitiesCount,
        unlocked: completedActivitiesCount >= 1,
      },
      {
        id: "streakStarter",
        icon: Flame,
        target: 3,
        current: streakStats.currentStreak,
        unlocked: streakStats.currentStreak >= 3,
      },
      {
        id: "dailyChallenge",
        icon: Trophy,
        target: 5,
        current: streakStats.currentStreak,
        unlocked: streakStats.currentStreak >= 5,
      },
      {
        id: "weekWarrior",
        icon: CalendarDays,
        target: 3,
        current: streakStats.daysThisWeek,
        unlocked: streakStats.daysThisWeek >= 3,
      },
      {
        id: "moduleMaster",
        icon: Target,
        target: 1,
        current: completedModules.length,
        unlocked: completedModules.length >= 1,
      },
    ];
  }, [completedActivitiesCount, streakStats, completedModules]);

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
              {t("dashboard.greeting", { name: user?.name || "Explorer" })}
            </h1>
            <p className="text-xl text-slate-600 font-medium">
              {t("dashboard.tagline")}
            </p>
          </div>
        </div>

        {/* Hero Widgets */}
        <div className="pt-2 flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1">
            <XPProgressWidget
              currentXp={currentXp}
              nextLevelXp={1000 * currentLevel}
              level={currentLevel}
            />
          </div>

          {/* Streak Meter with StreakMeter component */}
          <Card className="flex items-center gap-3 px-4 py-2 border-slate-200 shadow-sm min-w-[200px]">
            <div className="flex-1">
              <StreakMeter
                currentStreak={streakStats.currentStreak}
                longestStreak={streakStats.longestStreak}
                currentStreakDays={streakStats.weekDaysActive}
              />
            </div>
          </Card>

          {/* My Avatar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm min-w-[150px] cursor-pointer hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={() => navigate("/student/avatar")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/student/avatar");
                  }
                }}
              >
                <Avatar className="w-10 h-10 border-2 border-slate-200">
                  <AvatarImage
                    src={(user as any)?.avatarUrl}
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                    {(user?.name || "ME").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("dashboard.myAvatar")}
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {t("dashboard.customize")}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("dashboard.customize")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Goals Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          {t("dashboard.goals", { defaultValue: "Goals" })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Today's Goal */}
          <Card
            className={cn(
              "border-2 transition-all",
              streakStats.didCompleteToday
                ? "bg-green-50 border-green-200"
                : "bg-white border-slate-200",
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {streakStats.didCompleteToday ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Target className="w-5 h-5 text-blue-600" />
                )}
                {streakStats.didCompleteToday
                  ? t("dashboard.todaysGoalCompleteTitle", {
                      defaultValue: "Today's Goal Complete!",
                    })
                  : t("dashboard.todaysGoal", {
                      defaultValue: "Today's Goal",
                    })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-3">
                {streakStats.didCompleteToday
                  ? t("dashboard.todaysGoalCompleteDesc", {
                      defaultValue: "Great job! You completed an activity today.",
                    })
                  : t("dashboard.todaysGoalDesc", {
                      defaultValue: "Complete 1 activity (~15 minutes).",
                    })}
              </p>
              {!streakStats.didCompleteToday && (
                <Button size="sm" onClick={goToNext}>
                  {nextOne
                    ? t("dashboard.startActivity")
                    : t("dashboard.browseModules")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* This Week Goal */}
          <Card
            className={cn(
              "border-2 transition-all",
              streakStats.daysThisWeek >= 3
                ? "bg-green-50 border-green-200"
                : "bg-white border-slate-200",
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {streakStats.daysThisWeek >= 3 ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                )}
                {t("dashboard.thisWeek", { defaultValue: "This Week" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-3">
                {t("dashboard.thisWeekDesc", {
                  defaultValue: "Learn on 3 different days this week.",
                })}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      streakStats.daysThisWeek >= 3
                        ? "bg-green-500"
                        : "bg-blue-500",
                    )}
                    style={{
                      width: `${Math.min(100, (streakStats.daysThisWeek / 3) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {Math.min(streakStats.daysThisWeek, 3)}/3{" "}
                  {t("dashboard.days", { defaultValue: "days" })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Continue Learning Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          {t("dashboard.yourLessons")}
        </h2>
        <div
          className="bg-white rounded-lg border shadow-sm group cursor-pointer hover:shadow-lg transition-all duration-300 border-l-8 border-l-blue-500 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          role="button"
          tabIndex={0}
          aria-label={
            nextOne
              ? t("dashboard.continueLearningAria", {
                  defaultValue: "Continue Learning: {{module}} - {{activity}}",
                  module: nextOne.moduleTitle,
                  activity: nextOne.activityTitle,
                })
              : t("dashboard.browseModulesAria", "Browse all modules")
          }
          onClick={() => {
            if (nextOne) goToNext();
            else navigate("/student/modules");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (nextOne) goToNext();
              else navigate("/student/modules");
            }
          }}
        >
          <div className="bg-gradient-to-r from-blue-50 to-white p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {loading
                    ? t("dashboard.loading")
                    : nextOne
                      ? t("dashboard.continueLearning")
                      : t("dashboard.pickAModule")}
                </h3>
                <p className="text-slate-600">
                  {nextOne
                    ? `${nextOne.moduleTitle} • ${nextOne.unitTitle} • ${nextOne.lessonTitle}`
                    : modules.length > 0
                      ? t("dashboard.chooseModulePrompt")
                      : t("dashboard.noModules")}
                </p>
                {nextOne ? (
                  <p className="text-slate-500 text-sm mt-1">
                    {t("dashboard.upNext")}{" "}
                    {nextOne.kind === "INFO" ? "📖" : "🎮"}{" "}
                    {nextOne.activityTitle}
                  </p>
                ) : null}
              </div>
              <div
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "bg-blue-600 hover:bg-blue-700 text-white shadow-md h-10 px-4 py-2",
                )}
                aria-hidden="true"
              >
                {nextOne
                  ? t("dashboard.startActivity")
                  : t("dashboard.browseModules")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Your Activities Section - shows activities AFTER nextOne */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          {t("dashboard.yourActivities")}
        </h2>
        {loading ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">
              {t("dashboard.loadingActivities")}
            </p>
          </div>
        ) : upNext.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">
              {nextOne
                ? t("dashboard.finishCurrentToUnlockMore", {
                    defaultValue:
                      "Finish your current activity to unlock what's next!",
                  })
                : t("dashboard.caughtUp")}
            </p>
            <div className="mt-4">
              <Button
                variant={nextOne ? "default" : "outline"}
                onClick={() => {
                  if (nextOne) goToNext();
                  else navigate("/student/modules");
                }}
              >
                {nextOne
                  ? t("dashboard.startActivity")
                  : t("dashboard.goToModules")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upNext.map((a) => {
              const tokenKey = a.kind === "INFO" ? "story" : "game";
              const token = ACTIVITY_VISUAL_TOKENS[tokenKey];
              const Icon = () => {
                if (token.emoji)
                  return <span className="text-lg">{token.emoji}</span>;
                switch (token.iconName) {
                  case "BookOpen":
                    return <BookOpen className="w-5 h-5" />;
                  case "Star":
                    return <Star className="w-5 h-5" />;
                  case "Zap":
                    return <Zap className="w-5 h-5" />;
                  default:
                    return <Star className="w-5 h-5" />;
                }
              };

              return (
                <Card key={a.activityId} className="border-slate-200 shadow-sm">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${token.bubbleClass}`}
                    >
                      <Icon />
                    </div>
                    <CardTitle className="text-base text-brightboost-navy leading-tight">
                      {a.activityTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-slate-600 pl-[3.25rem]">
                      {a.unitTitle} • {a.lessonTitle}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() =>
                        navigate(
                          `/student/modules/${a.moduleSlug}/lessons/${a.lessonId}/activities/${a.activityId}`,
                        )
                      }
                      aria-label={t("dashboard.playActivity", {
                        activity: a.activityTitle,
                      })}
                    >
                      {t("dashboard.play")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Your Achievements Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          {t("dashboard.yourBadges")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {achievements.map((ach) => {
            const Icon = ach.icon;
            const progress = Math.min(1, ach.current / ach.target);

            return (
              <div
                key={ach.id}
                role="status"
                aria-label={`${t(`dashboard.achievements.${ach.id}.title`, {
                  defaultValue: ach.id,
                })}: ${
                  ach.unlocked
                    ? t("dashboard.unlocked", "Unlocked")
                    : t("dashboard.locked", "Locked")
                }`}
              >
                <Card
                  className={cn(
                    "flex flex-col items-center p-4 transition-all h-full",
                    ach.unlocked
                      ? "bg-yellow-50 border-yellow-200 shadow-sm"
                      : "bg-slate-50 border-slate-200",
                  )}
                >
                  <div
                    className={cn(
                      "p-3 rounded-full mb-2",
                      ach.unlocked
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-slate-200 text-slate-400",
                    )}
                  >
                    {ach.unlocked ? (
                      <Icon className="w-6 h-6" />
                    ) : (
                      <Lock className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-bold text-center mb-1",
                      ach.unlocked ? "text-yellow-700" : "text-slate-500",
                    )}
                  >
                    {t(`dashboard.achievements.${ach.id}.title`, {
                      defaultValue: ach.id,
                    })}
                  </span>
                  <span className="text-xs text-slate-500 text-center mb-2">
                    {t(`dashboard.achievements.${ach.id}.desc`, {
                      defaultValue: "",
                    })}
                  </span>
                  {!ach.unlocked && (
                    <div className="w-full">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 text-center mt-1">
                        {ach.current}/{ach.target}
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
