import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useApi } from "../services/api";
import GameBackground from "../components/GameBackground";
import StemModuleCard from "../components/StemModuleCard";
import LeaderboardCard from "../components/LeaderboardCard";
import WordGameCard from "../components/WordGameCard";
import BrightBoostRobot from "../components/BrightBoostRobot";
import { useTranslation } from "react-i18next";
import  LanguageToggle  from "../components/LanguageToggle";


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

const StudentDashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useApi();

  const [dashboardData, setDashboardData] =
    useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showStillLoading, setShowStillLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowStillLoading(false);

      const timeoutId = setTimeout(() => {
        setShowStillLoading(true);
      }, 10000);

      const isTestEnvironment =
        (window as any).Cypress || process.env.NODE_ENV === "test";
      const minLoadingPromise = isTestEnvironment
        ? new Promise((resolve) => setTimeout(resolve, 1000))
        : Promise.resolve();

      const [data] = await Promise.all([
        api.get("/api/student/dashboard"),
        minLoadingPromise,
      ]);

      clearTimeout(timeoutId);
      setDashboardData(data);
    } catch (err: any) {
      if (err.message === "Session expired") {
        logout();
        navigate("/student/login");
        return;
      }
      setError(err.message || "Failed to load dashboard data");
      console.error("Dashboard data fetch error:", err);
    } finally {
      setIsLoading(false);
      setShowStillLoading(false);
    }
  }, [api, logout, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stemActivities = [
    {
      title: t("dashboard.stem.math"),
      icon: "/icons/math.png",
      color: "bg-blue-100 hover:bg-blue-200",
      path: "/activities/math",
    },
    {
      title: t("dashboard.stem.science"),
      icon: "/icons/science.png",
      color: "bg-green-100 hover:bg-green-200",
      path: "/activities/science",
    },
    {
      title: t("dashboard.stem.coding"),
      icon: "/icons/coding.png",
      color: "bg-purple-100 hover:bg-purple-200",
      path: "/activities/coding",
    },
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

  if (isLoading) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div data-testid="loading-spinner" className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brightboost-blue mx-auto mb-4"></div>
            <p className="text-brightboost-navy">{t("dashboard.loading")}</p>
            {showStillLoading && (
              <p className="text-brightboost-navy/70 mt-2">{t("dashboard.stillLaoding")}</p>
            )}
          </div>
        </div>
      </GameBackground>
    );
  }

  if (error) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div data-testid="dashboard-error" className="text-center">
            <p className="text-red-600 mb-4">{t("dashboard.errorPrefix")}! {error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-brightboost-blue text-white px-4 py-2 rounded-lg hover:bg-brightboost-blue/80"
            >
              {t("dashboard.tryAgain")}
            </button>
          </div>
        </div>
      </GameBackground>
    );
  }
  return (
    <GameBackground>
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <BrightBoostRobot className="w-16 h-16" />
              <div>
                <h1 className="text-3xl font-bold text-brightboost-navy">
                  {t("dashboard.greeting", { name: user?.name || t("student") })}
                </h1>
                <p className="text-brightboost-blue">
                  {t("dashboard.readyPrompt")}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageToggle />
              <div className="flex items-center gap-2 bg-brightboost-yellow px-3 py-1 rounded-full">
                <span className="text-sm font-bold">
                  {t("dashboard.role")}
                </span>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                  {user?.name || t("student")}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {t("dashboard.logout")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StemModuleCard
              title={t("dashboard.stemCard.title")}
              subtitle={t("dashboard.stemCard.subtitle")}
              activities={stemActivities}
            />

            <WordGameCard
              title={t("dashboard.wordGame.title")}
              letters={["A", "B", "E", "L", "T"]}
              word="TABLE"
            />

            <LeaderboardCard 
            title={t("dashboard.leaderboard.title")}
            entries={leaderboardEntries}
            />
          </div>

          {dashboardData &&
            (dashboardData.courses?.length ||
              dashboardData.assignments?.length) && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-brightboost-navy mb-4">
                  {t("dashboard.coursesAndAssignments")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <h4 className="font-bold text-brightboost-navy mb-3">
                      {t("dashboard.enrolledCourses")}
                    </h4>
                    {dashboardData.courses &&
                      dashboardData.courses.map((course) => (
                        <div
                          key={course.id}
                          className="mb-2 p-2 bg-brightboost-lightblue/20 rounded"
                          data-cy="course-item"
                        >
                          <div className="font-medium">{course.name}</div>
                          <div className="text-sm text-gray-600">
                            {t("dashboard.grade")}: {course.grade} |{" "}
                            {t("dashboard.teacher")}: {course.teacher}
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <h4 className="font-bold text-brightboost-navy mb-3">
                      {t("dashboard.recentAssignments")}
                    </h4>
                    {dashboardData.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="mb-2 p-2 bg-brightboost-lightblue/20 rounded"
                          data-cy="assignment-item"
                        >
                          <div className="font-medium">{assignment.title}</div>
                          <div className="text-sm text-gray-600">
                            {t("dashboard.due")}: {assignment.dueDate} |{" "}
                            <span
                              className={`ml-1 ${assignment.status === "completed" ? "text-green-600" : "text-orange-600"}`}
                            >
                              {t(`dashboard.status.${assignment.status}`)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

          {(!dashboardData ||
            (!dashboardData.courses?.length &&
              !dashboardData.assignments?.length)) &&
            !isLoading &&
            !error && (
              <div className="mt-8 text-center">
                <p className="text-brightboost-navy">
                  {t("dashboard.noData")}
                </p>
              </div>
            )}

          <div className="mt-8 flex justify-center">
            <div className="flex space-x-4">
              <button className="bg-brightboost-blue hover:bg-brightboost-blue/80 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                {t("dashboard.startLearning")}
              </button>
              <button className="bg-brightboost-green hover:bg-brightboost-green/80 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                {t("dashboard.viewProgress")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default StudentDashboard;
