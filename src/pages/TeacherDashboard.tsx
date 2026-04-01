import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useApi, ApiError } from "../services/api";
import MainContent from "../components/TeacherDashboard/MainContent";
import { Lesson } from "../components/TeacherDashboard/types";
import { Rocket, School, Share2, PlayCircle, BarChart3, CheckCircle2 } from "lucide-react";

const TeacherDashboard: React.FC = () => {
  const { t } = useTranslation();
  const api = useApi();

  const [lessonsData, setLessonsData] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/teacher/courses");
      if (Array.isArray(response)) {
        const formattedLessons = response.map(
          (course: {
            id: string;
            name: string;
            joinCode: string;
            enrollmentCount: number;
            createdAt: string;
          }) => ({
            id: String(course.id),
            title: course.name,
            content: `${t("teacher.classes.joinCode")} ${course.joinCode} · ${t("teacher.classDetail.students", { count: course.enrollmentCount })}`,
            category: "Course",
            date: course.createdAt,
            status: "active",
          }),
        );
        setLessonsData(formattedLessons);
      } else {
        setLessonsData([]);
      }
    } catch (err) {
      console.error("Failed to fetch teacher data:", err);
      setError(t("teacher.lessons.failedFetch"));
    } finally {
      setIsLoading(false);
    }
  }, [api, setIsLoading, setError, setLessonsData, t]);

  useEffect(() => {
    fetchLessons();
  }, [api, fetchLessons]);

  const handleAddLesson = async (
    newLesson: Pick<Lesson, "title" | "content" | "category">,
  ) => {
    setIsLoading(true);
    try {
      const createdLesson = await api.post("/teacher/courses", {
        name: newLesson.title,
      });
      setLessonsData((prevLessons) => [
        ...prevLessons,
        { ...createdLesson, id: String(createdLesson.id) },
      ]);
    } catch (err) {
      console.error("Failed to add lesson:", err);
      setError(t("teacher.lessons.failedAdd"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLesson = async (lesson: Lesson) => {
    setIsLoading(true);
    try {
      const updatedLesson = await api.put(
        `/teacher/courses/${lesson.id}`,
        { name: lesson.title } as Record<string, unknown>,
      );
      setLessonsData((prevLessons) =>
        prevLessons.map((existingLesson) =>
          String(existingLesson.id) === String(lesson.id)
            ? {
                ...existingLesson,
                ...updatedLesson,
                id: String(existingLesson.id),
              }
            : existingLesson,
        ),
      );
    } catch (err) {
      console.error("Failed to edit lesson:", err);
      setError(t("teacher.lessons.failedEdit"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string | number) => {
    setIsLoading(true);
    try {
      await api.delete(`/teacher/courses/${lessonId}`);
    } catch (err) {
      // Treat 404 as success — the class is already gone
      const is404 = (err instanceof ApiError && err.status === 404) ||
        (err instanceof Error && /404/.test(err.message));
      if (!is404) {
        console.error("Failed to delete lesson:", err);
        setError(t("teacher.lessons.failedDelete"));
        setIsLoading(false);
        return;
      }
    }
    // Always remove from local state (whether delete succeeded or was 404)
    setLessonsData((prevLessons) =>
      prevLessons.filter((lesson) => String(lesson.id) !== String(lessonId)),
    );
    setIsLoading(false);
  };

  const gettingStartedSteps = [
    { icon: School, label: t("teacher.getStarted.step1"), to: "/teacher/classes" },
    { icon: Share2, label: t("teacher.getStarted.step2"), to: "/teacher/classes" },
    { icon: PlayCircle, label: t("teacher.getStarted.step3"), to: "/teacher/classes" },
    { icon: BarChart3, label: t("teacher.getStarted.step4"), to: "/teacher/dashboard" },
  ];

  return (
    <>
      {isLoading && (
        <div className="flex-grow p-6 text-center" aria-live="polite" aria-busy="true">
          <div className="h-8 bg-gray-300 animate-pulse w-1/3 mx-auto mb-4 rounded" />
          <div className="h-4 bg-gray-200 animate-pulse w-2/3 mx-auto rounded" />
        </div>
      )}
      {error && (
        <div className="flex-grow p-6 text-center" role="alert" aria-live="polite">
          <p className="text-xl text-red-500 mt-4">{error}</p>
          <button
            onClick={fetchLessons}
            className="mt-4 px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors"
          >
            {t("common.tryAgain", { defaultValue: "Try Again" })}
          </button>
        </div>
      )}
      {!isLoading && !error && lessonsData.length === 0 && (
        <div className="flex-grow p-6" role="status">
          <div className="max-w-xl mx-auto text-center">
            <Rocket className="w-12 h-12 mx-auto text-brightboost-blue mb-4" />
            <h2 className="text-2xl font-bold text-brightboost-navy">
              {t("teacher.getStarted.title")}
            </h2>
            <p className="text-gray-600 mt-2 mb-6">
              {t("teacher.getStarted.subtitle")}
            </p>
          </div>
          <div className="max-w-lg mx-auto space-y-3">
            {gettingStartedSteps.map(({ icon: Icon, label, to }, i) => (
              <Link
                key={i}
                to={to}
                className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-brightboost-blue/30 transition-all group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brightboost-blue/10 text-brightboost-blue text-sm font-bold group-hover:bg-brightboost-blue group-hover:text-white transition-colors">
                  {i + 1}
                </div>
                <Icon className="w-5 h-5 text-gray-400 group-hover:text-brightboost-blue transition-colors" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-brightboost-navy transition-colors">
                  {label}
                </span>
                <CheckCircle2 className="w-4 h-4 ml-auto text-gray-200" />
              </Link>
            ))}
          </div>
        </div>
      )}
      {!isLoading && !error && lessonsData.length > 0 && (
        <MainContent
          lessonsData={lessonsData}
          setLessonsData={setLessonsData}
          onAddLesson={handleAddLesson}
          onEditLesson={handleEditLesson}
          onDeleteLesson={handleDeleteLesson}
        />
      )}
    </>
  );
};

export default TeacherDashboard;
