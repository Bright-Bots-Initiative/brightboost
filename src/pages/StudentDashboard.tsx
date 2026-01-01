import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useStreak } from "@/hooks/useStreak";
import XPProgressWidget from "@/components/StudentDashboard/XPProgress";
import { Lock, Unlock, Bot, Flame } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

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

function sortNum(n: any, fallback = 9999) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function flattenModule(module: any): NextActivity[] {
  const out: NextActivity[] = [];
  const units = (module?.units || []).slice().sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
  for (const u of units) {
    const lessons = (u?.lessons || []).slice().sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
    for (const l of lessons) {
      const acts = (l?.activities || []).slice().sort((a: any, b: any) => sortNum(a.order) - sortNum(b.order));
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const { streak } = useStreak();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [avatar, setAvatar] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progressRows, setProgressRows] = useState<any[]>([]);
  const [currentModule, setCurrentModule] = useState<any>(null);
  const [upNext, setUpNext] = useState<NextActivity[]>([]);
  const [nextOne, setNextOne] = useState<NextActivity | null>(null);
  const [loading, setLoading] = useState(true);

  const currentLevel = useMemo(() => {
    const lvl = Number(avatar?.level);
    return Number.isFinite(lvl) && lvl > 0 ? lvl : 1;
  }, [avatar?.level]);

  const currentXp = useMemo(() => {
    const xp = Number(avatar?.xp);
    return Number.isFinite(xp) && xp >= 0 ? xp : 0;
  }, [avatar?.xp]);

  const badgeLevels = [1, 2, 3, 4, 5, 6];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [av, mods, prog] = await Promise.all([
          api.getAvatar(),
          api.getModules(),
          api.getProgress(),
        ]);
        if (cancelled) return;

        setAvatar(av);
        setModules(Array.isArray(mods) ? mods : []);
        setProgressRows(Array.isArray(prog?.progress) ? prog.progress : []);

        const modsList = Array.isArray(mods) ? mods : [];
        const progList = Array.isArray(prog?.progress) ? prog.progress : [];

        // Choose module: most recently progressed, else first available
        let chosenSlug: string | null = null;
        if (progList.length > 0) {
          const sorted = progList
            .slice()
            .sort((a: any, b: any) => {
              const at = new Date(a.updatedAt || 0).getTime();
              const bt = new Date(b.updatedAt || 0).getTime();
              return bt - at;
            });
          chosenSlug = sorted[0]?.moduleSlug || null;
        }
        if (!chosenSlug && modsList.length > 0) chosenSlug = modsList[0].slug;

        if (!chosenSlug) {
          setCurrentModule(null);
          setNextOne(null);
          setUpNext([]);
          return;
        }

        const deep = await api.getModule(chosenSlug);
        if (cancelled) return;

        setCurrentModule(deep);

        const ordered = flattenModule(deep);
        const completed = new Set(
          progList
            .filter((p: any) => p?.moduleSlug === chosenSlug && p?.status === "COMPLETED")
            .map((p: any) => String(p.activityId)),
        );

        const firstIncomplete = ordered.find((x) => !completed.has(String(x.activityId))) || null;
        setNextOne(firstIncomplete);

        if (!firstIncomplete) {
          setUpNext([]);
        } else {
          const startIdx = ordered.findIndex((x) => x.activityId === firstIncomplete.activityId);
          setUpNext(ordered.slice(startIdx, startIdx + 3));
        }
      } catch (e) {
        console.error(e);
        toast({
          title: "Dashboard unavailable",
          description: "Could not load your learning progress.",
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
  }, [toast]);

  const goToNext = () => {
    if (!nextOne) return navigate("/student/modules");
    navigate(
      `/student/modules/${nextOne.moduleSlug}/lessons/${nextOne.lessonId}/activities/${nextOne.activityId}`,
    );
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
              Hello, {user?.name || "Explorer"}!
            </h1>
            <p className="text-xl text-slate-600 font-medium">
              Let’s learn and have fun!
            </p>
          </div>
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/student/avatar")}
          >
            <Bot className="w-5 h-5" />
            Customize Bot
          </Button>
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

          {/* Streak Meter */}
          <Card className="flex items-center gap-3 px-4 py-2 border-slate-200 shadow-sm min-w-[200px]">
            <div className="p-2 bg-orange-100 rounded-full">
              <Flame className="w-5 h-5 text-orange-600 fill-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Streak
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900">
                  {streak?.currentStreak || 0}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Record: {streak?.longestStreak || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* My Avatar */}
          <Card
            className="flex items-center gap-3 px-4 py-2 border-slate-200 shadow-sm min-w-[150px] cursor-pointer hover:bg-slate-50 transition-colors"
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
                My Avatar
              </p>
              <p className="text-sm font-bold text-slate-700">Customize</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Level Progress Strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((level) => {
          const isUnlocked = level <= currentLevel;
          const badge = user?.badges?.find((b) =>
            b.name.toLowerCase().includes(`level ${level}`)
          );

          return (
            <div
              key={level}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                isUnlocked
                  ? "bg-white border-blue-200 shadow-sm"
                  : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500">
                Level
              </div>
              <div
                className={`text-2xl font-black ${
                  isUnlocked ? "text-blue-600" : "text-slate-400"
                }`}
              >
                {level}
              </div>
              <div className="mt-1 h-5 flex items-center justify-center">
                {!isUnlocked ? (
                  <Lock className="w-4 h-4 text-slate-400" />
                ) : badge?.awardedAt ? (
                  <span className="text-[10px] font-medium text-slate-500">
                    {format(new Date(badge.awardedAt), "MMM d")}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-blue-400">
                    Unlocked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dashboard Card Grid */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          Your Lessons
        </h2>
        <Card
          className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-l-8 border-l-blue-500 overflow-hidden"
          onClick={() => (nextOne ? goToNext() : navigate("/student/modules"))}
        >
          <div className="bg-gradient-to-r from-blue-50 to-white p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {loading ? "Loading…" : nextOne ? "Continue Learning" : "Pick a Module"}
                </h3>
                <p className="text-slate-600">
                  {nextOne
                    ? `${nextOne.moduleTitle} • ${nextOne.unitTitle} • ${nextOne.lessonTitle}`
                    : modules.length > 0
                      ? "Choose a module to start your next mission."
                      : "No modules available yet."}
                </p>
                {nextOne ? (
                  <p className="text-slate-500 text-sm mt-1">
                    Up next: {nextOne.kind === "INFO" ? "📖" : "🎮"} {nextOne.activityTitle}
                  </p>
                ) : null}
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (nextOne) goToNext();
                  else navigate("/student/modules");
                }}
              >
                {nextOne ? "Start Activity" : "Browse Modules"}
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Your Activities Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Your Activities
        </h2>
        {upNext.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">
              {loading ? "Loading your activities…" : "You’re all caught up. Pick a module to keep learning!"}
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate("/student/modules")}>
                Go to Modules
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upNext.map((a) => (
              <Card key={a.activityId} className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">
                    {a.kind === "INFO" ? "📖" : "🎮"} {a.activityTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-slate-600">
                    {a.unitTitle} • {a.lessonTitle}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      navigate(
                        `/student/modules/${a.moduleSlug}/lessons/${a.lessonId}/activities/${a.activityId}`,
                      )
                    }
                  >
                    Play
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Your Badges Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          Your Badges
        </h2>
        <div className="flex flex-wrap gap-4">
          {badgeLevels.map((lvl) => {
            const isUnlocked = currentLevel >= lvl;
            const badgeName = `Level ${lvl}`;
            // If user has a badge with this name, we can show date, etc.
            // For now, just unlocked/locked based on level.
            return (
              <Card
                key={lvl}
                className={`w-24 h-32 flex flex-col items-center justify-center gap-2 transition-all ${
                  isUnlocked
                    ? "bg-yellow-50 border-yellow-200 shadow-sm"
                    : "bg-slate-100 border-slate-200 opacity-60 grayscale"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    isUnlocked ? "bg-yellow-100 text-yellow-600" : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {isUnlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <span
                  className={`text-sm font-bold ${
                    isUnlocked ? "text-yellow-700" : "text-slate-500"
                  }`}
                >
                  {badgeName}
                </span>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}