import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import XPProgressWidget from "@/components/StudentDashboard/XPProgress";
import { Lock, Unlock, Bot } from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentLevel = user?.level ? Number(user.level) : 1;
  const badgeLevels = [1, 2, 3, 4, 5, 6];

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
            onClick={() => navigate("/avatar")}
          >
            <Bot className="w-5 h-5" />
            Customize Bot
          </Button>
        </div>

        {/* XP Progress Widget */}
        <div className="pt-2">
          <XPProgressWidget
            currentXp={user?.xp || 0}
            nextLevelXp={1000 * currentLevel}
            level={currentLevel}
          />
        </div>
      </div>

      {/* Your Lessons Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          Your Lessons
        </h2>
        <Card
          className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-l-8 border-l-blue-500 overflow-hidden"
          onClick={() => navigate("/modules")}
        >
          <div className="bg-gradient-to-r from-blue-50 to-white p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                  Continue Learning
                </h3>
                <p className="text-slate-600">
                  Unit 1: Introduction to Robots • Next Lesson
                </p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md">
                Start Lesson
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
        <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">
            No active activities right now. Check back later!
          </p>
        </div>
      </section>

      {/* Your Badges Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            Your Badges
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden flex items-center gap-2 text-slate-600"
            onClick={() => navigate("/avatar")}
          >
            <Bot className="w-4 h-4" />
            My Bot
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {badgeLevels.map((level) => {
            const isUnlocked = level <= currentLevel;
            return (
              <div
                key={level}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center p-4 transition-all duration-300
                  ${isUnlocked
                    ? "bg-gradient-to-br from-yellow-100 to-amber-50 border-2 border-yellow-200 shadow-sm"
                    : "bg-slate-100 border-2 border-slate-200 opacity-70 grayscale"
                  }
                `}
              >
                <div className={`
                  mb-2 p-3 rounded-full
                  ${isUnlocked ? "bg-yellow-200 text-yellow-700" : "bg-slate-200 text-slate-500"}
                `}>
                  {isUnlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <span className={`
                  font-bold text-sm
                  ${isUnlocked ? "text-yellow-800" : "text-slate-500"}
                `}>
                  Level {level}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
