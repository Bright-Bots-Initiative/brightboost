// src/pages/StudentDashboard.tsx
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import XPProgressWidget from "@/components/StudentDashboard/XPProgress";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-black text-slate-800">
          Hi, {user?.name || "Explorer"}! 👋
        </h1>
      </div>

      <XPProgressWidget
        currentXp={user?.xp || 0}
        nextLevelXp={1000 * ((user?.level ? Number(user.level) : 1) || 1)}
        level={user?.level ? Number(user.level) : 1}
      />

      {/* Big Continue CTA */}
      <div className="mb-8">
        <div
          onClick={() => navigate("/modules")}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl cursor-pointer transform hover:scale-[1.02] transition-all"
        >
          <h2 className="text-2xl font-black mb-2">Continue Journey 🚀</h2>
          <p className="opacity-90 mb-4">Unit 1: Introduction to Robots</p>
          <Button
            variant="secondary"
            size="lg"
            className="w-full font-bold text-blue-700"
          >
            Play Next Lesson
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        <Card
          className="hover:shadow-lg transition cursor-pointer border-l-4 border-l-green-400"
          onClick={() => navigate("/modules")}
        >
          <CardHeader>
            <CardTitle>All Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Replay your favorite activities</p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition cursor-pointer border-l-4 border-l-purple-400"
          onClick={() => navigate("/avatar")}
        >
          <CardHeader>
            <CardTitle>My Bot</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Level 1 • AI Archetype</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
