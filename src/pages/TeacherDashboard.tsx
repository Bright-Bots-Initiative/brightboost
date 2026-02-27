import React, { useState, useEffect, useCallback } from "react";
import { useApi } from "../services/api";
import BrightBoostRobot from "../components/BrightBoostRobot";
import MainContent from "../components/TeacherDashboard/MainContent";
import { Lesson } from "../components/TeacherDashboard/types";

const TeacherDashboard: React.FC = () => {
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
            content: `Join code: ${course.joinCode} · ${course.enrollmentCount} student${course.enrollmentCount !== 1 ? "s" : ""}`,
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
      setError(
        err instanceof Error ? err.message : "Failed to fetch teacher data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [api, setIsLoading, setError, setLessonsData]);

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
      setError(err instanceof Error ? err.message : "Failed to add lesson.");
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
      setError(err instanceof Error ? err.message : "Failed to edit lesson.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string | number) => {
    setIsLoading(true);
    try {
      await api.delete(`/teacher/courses/${lessonId}`);
      setLessonsData((prevLessons) =>
        prevLessons.filter((lesson) => String(lesson.id) !== String(lessonId)),
      );
    } catch (err) {
      console.error("Failed to delete lesson:", err);
      setError(err instanceof Error ? err.message : "Failed to delete lesson.");
    } finally {
      setIsLoading(false);
    }
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
            Loading dashboard data...
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
          <p className="text-xl text-red-500 mt-4">Error: {error}</p>
        </div>
      )}
      {!isLoading && !error && lessonsData.length === 0 && (
        <div className="flex-grow p-6 text-center" role="status">
          <BrightBoostRobot size="lg" />
          <h2 className="text-xl text-brightboost-navy mt-4">
            No teacher data available yet.
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Teachers will appear here once they're registered in the system.
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
