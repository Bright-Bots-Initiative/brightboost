// src/pages/TeacherDashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "../services/api";
import GameBackground from "../components/GameBackground";
import BrightBoostRobot from "../components/BrightBoostRobot";
import Sidebar from "../components/TeacherDashboard/Sidebar";
import MainContent from "../components/TeacherDashboard/MainContent";
import { Lesson } from "../components/TeacherDashboard/types";
import TeacherNavbar from "../components/TeacherDashboard/TeacherNavbar";

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useApi();

  const [lessonsData, setLessonsData] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/teacher/dashboard");
      if (Array.isArray(response)) {
        const formattedLessons = response.map(
          (teacher: {
            id: string;
            name: string;
            email: string;
            createdAt: string;
          }) => ({
            id: String(teacher.id),
            title: teacher.name,
            content: `Teacher: ${teacher.email}`,
            category: "Teacher",
            date: teacher.createdAt,
            status: "active",
          }),
        );
        setLessonsData(formattedLessons);
      } else if (response.lessons) {
        const formattedLessons = response.lessons.map(
          (lesson: {
            id: string;
            title: string;
            content: string;
            category: string;
            date: string;
            status: string;
          }) => lesson,
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
      const createdLesson = await api.post("/api/lessons", newLesson);
      setLessonsData((prevLessons) => [
        ...prevLessons,
        { ...createdLesson, id: String(createdLesson.id) },
      ]);
    } catch (err) {
      console.error("Failed to add lesson:", err);
      setError(err instanceof Error ? err.message : "Failed to add lesson.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLesson = async (lesson: Lesson) => {
    setIsLoading(true);
    try {
      const updatedLesson = await api.put(
        `/api/lessons/${lesson.id}`,
        lesson as unknown as Record<string, unknown>,
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string | number) => {
    setIsLoading(true);
    try {
      await api.delete(`/api/lessons/${lessonId}`);
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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col relative z-10">
        <TeacherNavbar
          userName={user?.name || "Teacher"}
          onLogout={handleLogout}
        />

        <Sidebar />

        {isLoading && (
          <div className="flex-grow p-6 ml-64 text-center">
            <BrightBoostRobot size="lg" />
            <p className="text-xl text-brightboost-navy mt-4">
              Loading dashboard data...
            </p>
          </div>
        )}
        {error && (
          <div className="flex-grow p-6 ml-64 text-center">
            <BrightBoostRobot size="lg" />
            <p className="text-xl text-red-500 mt-4">Error: {error}</p>
          </div>
        )}
        {!isLoading && !error && lessonsData.length === 0 && (
          <div className="flex-grow p-6 ml-64 text-center">
            <BrightBoostRobot size="lg" />
            <p className="text-xl text-brightboost-navy mt-4">
              No teacher data available yet.
            </p>
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
      </div>
    </GameBackground>
  );
};

export default TeacherDashboard;