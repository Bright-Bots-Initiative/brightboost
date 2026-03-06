import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../services/api";
import BrightBoostRobot from "../components/BrightBoostRobot";
import MainContent from "../components/TeacherDashboard/MainContent";
import { Lesson } from "../components/TeacherDashboard/types";

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
      const is404 = err instanceof Error && /404/.test(err.message);
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

  return (
    <>
      {isLoading && (
        <div
          className="flex-grow p-6 text-center"
          aria-live="polite"
          aria-busy="true"
        >
          <BrightBoostRobot size="lg" />
          <p className="text-xl text-brightboost-navy mt-4">
            {t("teacher.lessons.loading")}
          </p>
        </div>
      )}
      {error && (
        <div
          className="flex-grow p-6 text-center"
          role="alert"
          aria-live="polite"
        >
          <BrightBoostRobot size="lg" />
          <p className="text-xl text-red-500 mt-4">{error}</p>
        </div>
      )}
      {!isLoading && !error && lessonsData.length === 0 && (
        <div className="flex-grow p-6 text-center" role="status">
          <BrightBoostRobot size="lg" />
          <h2 className="text-xl text-brightboost-navy mt-4">
            {t("teacher.lessons.noData")}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {t("teacher.lessons.noDataDesc")}
          </p>
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
