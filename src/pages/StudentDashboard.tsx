import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useApi } from "../services/api";
import GameBackground from "../components/GameBackground";
import StemModuleCard from "../components/StemModuleCard";
import LeaderboardCard from "../components/LeaderboardCard";
import WordGameCard from "../components/WordGameCard";
import BrightBoostRobot from "../components/BrightBoostRobot";
import StreakMeter from "../components/ui/StreakMeter";
import { useStreak } from "../hooks/useStreak";
import { clearCachedStreak } from "../lib/streakDB";

interface Course {
  id: string;
  name: string;
  grade: string;
  teacher: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  status: "pending" | "completed";
}

interface StudentDashboardData {
  message: string;
  courses: Course[];
  assignments: Assignment[];
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLastSunday(today: Date): Date {
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const lastSunday = new Date(today);
  lastSunday.setHours(0, 0, 0, 0);
  lastSunday.setDate(today.getDate() - dayOfWeek);
  return lastSunday;
}

function generateCurrentStreakDaysFromArray(streakDays: string[], serverDateUTC: string): boolean[] {
  const days = Array(7).fill(false);
  if (!streakDays?.length) return days;

  const today = new Date(serverDateUTC);
  today.setHours(0, 0, 0, 0);
  const lastSunday = getLastSunday(today);
  const streakDaySet = new Set(streakDays);

  for (let i = 0; i < 7; i++) {
    const day = new Date(lastSunday);
    day.setDate(lastSunday.getDate() + i);
    if (day > today) break;
    const dayStr = formatLocalDate(day);
    days[i] = streakDaySet.has(dayStr);
  }

  return days;
}

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useApi();

  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStillLoading, setShowStillLoading] = useState(false);

  const { streak, loading: streakLoading, completeModule } = useStreak();

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowStillLoading(false);

      const timeoutId = setTimeout(() => setShowStillLoading(true), 10000);
      const data = await api.get("/api/student/dashboard");
      clearTimeout(timeoutId);
      setDashboardData(data);
    } catch (err: any) {
      if (err.message === "Session expired") {
        logout();
        navigate("/student/login");
        return;
      }
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setShowStillLoading(false);
    }
  }, [api, logout, navigate]);

  // Expose completeModule on window for Cypress tests only
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Cypress && completeModule) {
      (window as any).completeModule = completeModule;
    }
  }, [completeModule]);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Cypress && streak) {
      (window as any).currentStreak = streak.currentStreak;
      (window as any).longestStreak = streak.longestStreak;
      (window as any).streakDays = streak.streakDays;
      (window as any).serverDateUTC = streak.serverDateUTC;
    }
  }, [streak]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleResetStreak = async () => {
    await clearCachedStreak();
    window.dispatchEvent(new CustomEvent("streakUpdated", { detail: null }));
    alert("Streak data has been reset for testing.");
  };

  if (streakLoading || isLoading) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brightboost-blue mx-auto mb-4"></div>
            <p className="text-brightboost-navy">Loading your dashboard...</p>
            {showStillLoading && <p className="text-brightboost-navy/70 mt-2">Still loading...</p>}
          </div>
        </div>
      </GameBackground>
    );
  }

  if (error) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Oops! {error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-brightboost-blue text-white px-4 py-2 rounded-lg hover:bg-brightboost-blue/80"
            >
              Try Again
            </button>
          </div>
        </div>
      </GameBackground>
    );
  }

  const streakDays = streak?.streakDays ?? [];
  const serverDateUTC = streak?.serverDateUTC ?? new Date().toISOString();
  const currentStreakDays = generateCurrentStreakDaysFromArray(streakDays, serverDateUTC);
  const currentStreakSafe = Number(streak?.currentStreak) || 0;
  const longestStreakSafe = Number(streak?.longestStreak) || 0;

  const stemActivities = [
    { title: "STEM 1", icon: "/icons/math.png", color: "bg-blue-100 hover:bg-blue-200", path: "/activities/math" },
    { title: "Science Lab", icon: "/icons/science.png", color: "bg-green-100 hover:bg-green-200", path: "/activities/science" },
    { title: "Coding Fun", icon: "/icons/coding.png", color: "bg-purple-100 hover:bg-purple-200", path: "/activities/coding" },
  ];

  const leaderboardEntries = [
    { rank: 1, name: "Alex", points: 1250, avatar: "/avatars/alex.png" },
    { rank: 2, name: "Sarah", points: 1180, avatar: "/avatars/sarah.png" },
    { rank: 3, name: "Mike", points: 1050, avatar: "/avatars/mike.png" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <GameBackground>
      <div className="min-h-screen p-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <BrightBoostRobot className="w-16 h-16" />
            <div>
              <h1 className="text-3xl font-bold text-brightboost-navy">Hello, {user?.name || "Student"}!</h1>
              <p className="text-brightboost-blue">Ready to learn something new today?</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2 bg-brightboost-yellow px-3 py-1 rounded-full">
              <span className="text-sm font-bold">Level Explorer</span>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full">{user?.name || "Student"}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 max-w-md" data-cy="streak-meter">
          <StreakMeter
            currentStreak={currentStreakSafe}
            longestStreak={longestStreakSafe}
            currentStreakDays={currentStreakDays}
            barColor="#FF8C00"
            onNewRecord={(bonus) => {
              console.log(`New record! Bonus XP: ${bonus}`);
            }}
          />
        </div>

        <div className="mb-8 flex space-x-4">
          <button
            onClick={() => completeModule("test-module-1")}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            data-cy="increment-streak-button"
          >
            Complete Test Module (Simulate)
          </button>
          <button
            onClick={handleResetStreak}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            data-cy="reset-streak-button"
          >
            Reset Streak (Test)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StemModuleCard title="STEM 1" subtitle="Let's play with us!" activities={stemActivities} />
          <WordGameCard title="Letter Game" letters={["A", "B", "E", "L", "T"]} word="TABLE" />
          <LeaderboardCard title="Leaderboard" entries={leaderboardEntries} />
        </div>

        {dashboardData &&
          (dashboardData.courses?.length || dashboardData.assignments?.length) && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-md">
                <h4 className="font-bold text-brightboost-navy mb-3">Enrolled Courses</h4>
                {dashboardData.courses.map((course) => (
                  <div key={course.id} className="mb-2 p-2 bg-brightboost-lightblue/20 rounded" data-cy="course-item">
                    <div className="font-medium">{course.name}</div>
                    <div className="text-sm text-gray-600">
                      Grade: {course.grade} | Teacher: {course.teacher}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg p-4 shadow-md">
                <h4 className="font-bold text-brightboost-navy mb-3">Recent Assignments</h4>
                {dashboardData.assignments.map((assignment) => (
                  <div key={assignment.id} className="mb-2 p-2 bg-brightboost-lightblue/20 rounded" data-cy="assignment-item">
                    <div className="font-medium">{assignment.title}</div>
                    <div className="text-sm text-gray-600">
                      Due: {assignment.dueDate} |{" "}
                      <span className={`ml-1 ${assignment.status === "completed" ? "text-green-600" : "text-orange-600"}`}>
                        {assignment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {(!dashboardData?.courses?.length && !dashboardData?.assignments?.length) && !isLoading && !error && (
          <div className="mt-8 text-center">
            <p className="text-brightboost-navy">Let's start your first quest!</p>
          </div>
        )}

        <div className="mt-8 flex justify-center space-x-4">
          <button className="bg-brightboost-blue hover:bg-brightboost-blue/80 text-white px-6 py-3 rounded-lg font-semibold">
            Start Learning
          </button>
          <button className="bg-brightboost-green hover:bg-brightboost-green/80 text-white px-6 py-3 rounded-lg font-semibold">
            View Progress
          </button>
        </div>
      </div>
    </GameBackground>
  );
};

export default StudentDashboard;

