import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useStreak } from "@/hooks/useStreak";
import XPProgressWidget from "@/components/StudentDashboard/XPProgress";
import { Bot, Flame, BookOpen, Rocket, Trophy, PlayCircle, ArrowRight, Lock } from "lucide-react";
import { format } from "date-fns";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { streak } = useStreak();
  const navigate = useNavigate();

  const currentLevel = (() => {
    const lvl = user?.level;
    if (!lvl) return 1;
    const num = Number(String(lvl).replace(/[^0-9]/g, ""));
    return !isNaN(num) && num > 0 ? num : 1;
  })();

  const dashboardCards = [
    {
      title: "Current Module",
      subtitle: "Unit 1: Introduction to Robots",
      icon: <BookOpen className="w-8 h-8 text-blue-500" />,
      ctaText: "Continue",
      ctaAction: () => navigate("/student/modules"),
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: "STEM Module",
      subtitle: "STEM 1: Mars Rover Mission",
      icon: <Rocket className="w-8 h-8 text-purple-500" />,
      ctaText: "Open STEM 1",
      ctaAction: () => navigate("/student/modules"), // Fallback to modules list as explicit Stem1 route is dynamic/hidden
      color: "bg-purple-50 border-purple-200",
    },
    {
      title: "Next Module",
      subtitle: "Unit 2: Advanced Programming",
      icon: <PlayCircle className="w-8 h-8 text-emerald-500" />,
      ctaText: "Preview",
      ctaAction: () => navigate("/student/modules"),
      color: "bg-emerald-50 border-emerald-200",
    },
    {
      title: "Leaderboard",
      subtitle: "Class Standings",
      icon: <Trophy className="w-8 h-8 text-amber-500" />,
      ctaText: "View",
      ctaAction: () => navigate("/student/arena"),
      color: "bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="space-y-4">
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
              currentXp={user?.xp || 0}
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
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          Your Dashboard
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card, index) => (
            <Card
              key={index}
              className={`flex flex-col h-full hover:shadow-lg transition-all duration-300 border-t-4 ${card.color.replace('bg-', 'border-t-').split(' ')[1]}`}
            >
              <CardHeader className={`${card.color} pb-4`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {card.icon}
                  </div>
                </div>
                <CardTitle className="text-lg font-bold text-slate-800">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow pt-4">
                <p className="text-slate-600 font-medium">
                  {card.subtitle}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  className="w-full gap-2 font-semibold"
                  variant={index === 0 ? "default" : "secondary"}
                  onClick={card.ctaAction}
                >
                  {card.ctaText}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
