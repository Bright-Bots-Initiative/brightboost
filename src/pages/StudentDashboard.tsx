import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
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
  Trophy,
  Sparkles,
  CalendarDays,
  Target,
  Check,
  Rocket,
} from "lucide-react";
import { api, useApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { translateContentName } from "@/utils/localizedContent";
import { getStudentArchetype, canAccessModule } from "@/lib/moduleAccess";
import {
  computeStreakFromProgress,
  ProgressLike,
  StreakStats,
} from "@/lib/streakFromProgress";
import StreakMeter from "@/components/ui/StreakMeter";
import { ClipboardList, ArrowRight, Heart, Users, ClipboardCheck } from "lucide-react";
import PulseSurveyDialog from "@/components/student/PulseSurveyDialog";

type AssignedSession = {
  id: string;
  title: string;
  activityId?: string;
  activityTitle: string;
  moduleSlug?: string | null;
  lessonId?: string | null;
  dueDate: string;
  courseName: string;
  completed: boolean;
};

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
  const authApi = useApi();

  const [avatar, setAvatar] = useState<any>(null);
  const [, setModules] = useState<any[]>([]);
  const [progressList, setProgressList] = useState<any[]>([]);
  const [upNext, setUpNext] = useState<NextActivity[]>([]);
  const [nextOne, setNextOne] = useState<NextActivity | null>(null);
  const [completedModules, setCompletedModules] = useState<CompletedModule[]>(
    [],
  );
  const [completedActivitiesCount, setCompletedActivitiesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [assignedSessions, setAssignedSessions] = useState<AssignedSession[]>([]);

  // Enrolled courses + pulse survey state
  const [enrolledCourses, setEnrolledCourses] = useState<{ id: string; name: string }[]>([]);
  const [pulseTarget, setPulseTarget] = useState<{ courseId: string; courseName: string; kind: "PRE" | "POST" } | null>(null);
  const [pulseDoneKeys, setPulseDoneKeys] = useState<Set<string>>(new Set());

  // Benchmark state (API-driven, not localStorage)
  const [studentBenchmarks, setStudentBenchmarks] = useState<
    { id: string; kind: string; courseName: string; courseId: string; templateTitle: string; completed: boolean; locked: boolean }[]
  >([]);

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

        const allMods = Array.isArray(mods) ? mods : [];
        const progList = Array.isArray(prog?.progress) ? prog.progress : [];
        setProgressList(progList);

        // Filter out specialization-locked modules
        const studentArch = getStudentArchetype(av);
        const modsList = allMods.filter((m: any) =>
          canAccessModule({ slug: m.slug, archetype: studentArch }),
        );
        setModules(modsList);

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

        // Load assigned sessions (pilot mode)
        try {
          const sessions = await authApi.get("/student/assignments");
          if (!cancelled && Array.isArray(sessions)) {
            setAssignedSessions(sessions);
          }
        } catch {
          // No sessions or not enrolled — that's fine
        }

        // Load enrolled courses for pulse surveys
        try {
          const courses = await authApi.get("/student/courses");
          if (!cancelled && Array.isArray(courses)) {
            setEnrolledCourses(courses.map((c: any) => ({ id: c.courseId, name: c.courseName })));
            // Build set of already-completed pulse keys from localStorage
            const doneKeys = new Set<string>();
            for (const c of courses) {
              if (localStorage.getItem(`bb_pulse_pre_${c.courseId}`)) doneKeys.add(`pre_${c.courseId}`);
              if (localStorage.getItem(`bb_pulse_post_${c.courseId}`)) doneKeys.add(`post_${c.courseId}`);
            }
            setPulseDoneKeys(doneKeys);
          }
        } catch {
          // Not enrolled in any courses — that's fine
        }

        // Load benchmarks for enrolled courses (API-driven)
        try {
          const courses = await authApi.get("/student/courses");
          if (!cancelled && Array.isArray(courses)) {
            const allBenchmarks: typeof studentBenchmarks = [];
            for (const c of courses) {
              try {
                const bms = await authApi.get(`/student/courses/${c.courseId}/benchmarks`);
                if (Array.isArray(bms)) {
                  for (const b of bms) {
                    allBenchmarks.push({
                      id: b.id,
                      kind: b.kind,
                      courseName: c.courseName,
                      courseId: c.courseId,
                      templateTitle: b.template?.title ?? "Benchmark",
                      completed: !!b.completed,
                      locked: !!b.locked,
                    });
                  }
                }
              } catch { /* skip */ }
            }
            if (!cancelled) setStudentBenchmarks(allBenchmarks);
          }
        } catch { /* skip */ }
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
  }, [toast, t, authApi]);

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
      {/* Hero Action — the ONE thing a kid should click */}
      {!loading && (
        <button
          onClick={() => {
            if (nextOne) goToNext();
            else navigate("/student/modules");
          }}
          className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-1 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
        >
          <div className="rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-6 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {nextOne ? t("dashboard.playNext") : t("dashboard.startPlaying")}
              </h2>
              <p className="text-white/80 text-sm md:text-base mt-0.5">
                {nextOne
                  ? `${translateContentName(nextOne.moduleTitle)} — ${translateContentName(nextOne.activityTitle)}`
                  : t("dashboard.pickModuleAdventure")}
              </p>
            </div>
            <ArrowRight className="w-8 h-8 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>
      )}

      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
              {t("dashboard.welcomeBack", { name: (user?.name || "Explorer").split(" ")[0] })}
            </h1>
            <p className="text-xl text-slate-600 font-medium">
              {t("dashboard.readyForAdventure")}
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

          {/* My Star */}
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
                {(user as any)?.loginIcon ? (
                  <span className="text-3xl w-10 h-10 flex items-center justify-center">
                    {(user as any).loginIcon}
                  </span>
                ) : (
                  <Avatar className="w-10 h-10 border-2 border-slate-200">
                    <SafeAvatarImage
                      src={user?.avatarUrl}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                      {(user?.name || "ME").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("nav.myStar")}
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {"⭐"}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("nav.myStar")}</p>
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

      {/* Assigned Sessions (Pilot Mode) */}
      {assignedSessions.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            {t("dashboard.assignedSessions")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedSessions
              .filter((s) => !s.completed)
              .map((s) => (
                <Card key={s.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <p className="text-xs text-slate-500">
                      {s.courseName} &middot; {t("dashboard.duePrefix")} {s.dueDate}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (s.moduleSlug && s.lessonId && s.activityId) {
                          navigate(
                            `/student/modules/${s.moduleSlug}/lessons/${s.lessonId}/activities/${s.activityId}`,
                          );
                        }
                      }}
                      disabled={!s.moduleSlug || !s.activityId}
                    >
                      {t("dashboard.start")}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            {assignedSessions.filter((s) => s.completed).length > 0 && (
              <div className="col-span-full text-sm text-green-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                {t("dashboard.sessionsCompleted", { count: assignedSessions.filter((s) => s.completed).length })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Join a Class */}
      <section>
        <Card
          className="border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer"
          onClick={() => navigate("/student/join")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/student/join");
            }
          }}
        >
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{t("dashboard.joinClass")}</p>
              <p className="text-sm text-slate-500">
                {enrolledCourses.length > 0
                  ? t("dashboard.joinClassWithCount", { count: enrolledCourses.length })
                  : t("dashboard.joinClassDesc")}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-400" />
          </CardContent>
        </Card>
      </section>

      {/* Quick Check-In Section */}
      {enrolledCourses.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" />
            {t("dashboard.quickCheckIn")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledCourses.map((course) => {
              const preDone = pulseDoneKeys.has(`pre_${course.id}`);
              const postDone = pulseDoneKeys.has(`post_${course.id}`);
              return (
                <Card key={course.id} className="border-l-4 border-l-pink-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{course.name}</CardTitle>
                    <p className="text-xs text-slate-500">
                      {preDone && postDone
                        ? t("dashboard.allCheckInsDone")
                        : preDone
                          ? t("dashboard.firstCheckInDone")
                          : t("dashboard.tellUsHowYouFeel")}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {!preDone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPulseTarget({ courseId: course.id, courseName: course.name, kind: "PRE" })
                        }
                      >
                        {t("dashboard.howDoIFeel")}
                      </Button>
                    )}
                    {preDone && !postDone && completedActivitiesCount >= 3 && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setPulseTarget({ courseId: course.id, courseName: course.name, kind: "POST" })
                        }
                      >
                        {t("dashboard.checkInAgain")}
                      </Button>
                    )}
                    {preDone && !postDone && completedActivitiesCount < 3 && (
                      <p className="text-xs text-slate-400">
                        {t("dashboard.completeMoreToUnlock", { count: 3 - completedActivitiesCount })}
                      </p>
                    )}
                    {preDone && postDone && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> {t("dashboard.allDone")}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Benchmark Assessments */}
      {studentBenchmarks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-brightboost-blue" />
            {t("benchmark.student.sectionTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentBenchmarks.map((b) => (
              <Card key={b.id} className="border-l-4 border-l-brightboost-blue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{b.templateTitle}</CardTitle>
                  <p className="text-xs text-slate-500">
                    {b.courseName} · {b.kind === "PRE" ? t("benchmark.student.preLabel") : t("benchmark.student.postLabel")}
                  </p>
                </CardHeader>
                <CardContent>
                  {b.completed ? (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="w-4 h-4" /> {t("benchmark.student.done")}
                    </span>
                  ) : b.locked ? (
                    <span className="text-sm text-slate-400 flex items-center gap-1">
                      <Lock className="w-4 h-4" /> {t("benchmark.student.locked")}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/student/benchmark/${b.id}`)}
                    >
                      {t("benchmark.student.start")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Pulse Survey Dialog */}
      {pulseTarget && (
        <PulseSurveyDialog
          open={!!pulseTarget}
          onOpenChange={(open) => {
            if (!open) setPulseTarget(null);
          }}
          courseId={pulseTarget.courseId}
          courseName={pulseTarget.courseName}
          kind={pulseTarget.kind}
          onSubmitted={() => {
            // Update local done keys so UI refreshes immediately
            setPulseDoneKeys((prev) => {
              const next = new Set(prev);
              next.add(`${pulseTarget.kind.toLowerCase()}_${pulseTarget.courseId}`);
              return next;
            });
            setPulseTarget(null);
          }}
        />
      )}

      {/* Keep Playing — merged lessons + activities in one sequential list */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Rocket className="w-6 h-6 text-purple-500" />
          {t("dashboard.keepPlaying")}
        </h2>
        {loading ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">
              {t("dashboard.loadingActivities")}
            </p>
          </div>
        ) : !nextOne && upNext.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">
              {t("dashboard.caughtUp")}
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/student/modules")}
              >
                {t("dashboard.goToModules")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Merged list: nextOne first (highlighted), then upNext items */}
            {[...(nextOne ? [nextOne] : []), ...upNext].map((a, idx) => {
              const isUpNext = idx === 0 && !!nextOne;
              const icon = a.kind === "INFO" ? "📖" : "🎮";
              const label = a.kind === "INFO" ? t("dashboard.storyLabel") : t("dashboard.gameLabel");

              return (
                <div
                  key={a.activityId}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border p-4 transition-all",
                    isUpNext
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-md"
                      : "bg-white border-slate-200 shadow-sm hover:shadow-md",
                  )}
                >
                  <span className="text-2xl" aria-hidden>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-brightboost-navy truncate">
                        {translateContentName(a.activityTitle)}
                      </span>
                      {isUpNext && (
                        <span className="flex-shrink-0 text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          {t("dashboard.upNextBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {translateContentName(a.moduleTitle)} · {label}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className={isUpNext ? "bg-blue-600 hover:bg-blue-700" : ""}
                    variant={isUpNext ? "default" : "outline"}
                    onClick={() =>
                      navigate(
                        `/student/modules/${a.moduleSlug}/lessons/${a.lessonId}/activities/${a.activityId}`,
                      )
                    }
                  >
                    {isUpNext ? t("dashboard.play") : t("dashboard.start")}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
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
