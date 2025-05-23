import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../services/api'; // Import useApi
import GameBackground from '../components/GameBackground';
import BrightGrantsRobot from '../components/BrightGrantsRobot';
import Sidebar from '../components/TeacherDashboard/Sidebar';
import MainContent from '../components/TeacherDashboard/MainContent';
import { Lesson } from '../components/TeacherDashboard/types'; // Ensure this path is correct, might be '../TeacherDashboard/types'

const OrganizationDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useApi(); // Initialize useApi

  const [activeView, setActiveView] = useState<string>('Lessons');
  const [lessonsData, setLessonsData] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/organization/dashboard');
      if (response && response.lessons) {
        const formattedLessons = response.lessons.map((lesson: Lesson) => ({
          ...lesson,
          id: String(lesson.id),
        }));
        setLessonsData(formattedLessons);
      } else {
        setLessonsData([]);
      }
    } catch (err) {
      console.error("Failed to fetch lessons:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch lessons.');
    } finally {
      setIsLoading(false);
    }
  }, [api, setIsLoading, setError, setLessonsData]);

  useEffect(() => {
    fetchLessons();
  }, [api, fetchLessons]); // api and fetchLessons as dependencies

  const handleAddLesson = async (newLesson: Pick<Lesson, 'title' | 'content' | 'category'>) => {
    setIsLoading(true);
    try {
      const createdLesson = await api.post('/api/lessons', newLesson);
      setLessonsData(prevLessons => [...prevLessons, { ...createdLesson, id: String(createdLesson.id) }]);
    } catch (err) {
      console.error("Failed to add lesson:", err);
      setError(err instanceof Error ? err.message : 'Failed to add lesson.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLesson = async (lesson: Lesson) => {
    setIsLoading(true);
    try {
      const updatedLesson = await api.put(`/api/lessons/${lesson.id}`, lesson as unknown as Record<string, unknown>);
      setLessonsData(prevLessons =>
        prevLessons.map(existingLesson =>
          String(existingLesson.id) === String(lesson.id) ? { ...existingLesson, ...updatedLesson, id: String(existingLesson.id) } : existingLesson
        )
      );
    } catch (err) {
      console.error("Failed to edit lesson:", err);
      setError(err instanceof Error ? err.message : 'Failed to edit lesson.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string | number) => {
    setIsLoading(true);
    try {
      await api.delete(`/api/lessons/${lessonId}`);
      setLessonsData(prevLessons => prevLessons.filter(lesson => String(lesson.id) !== String(lessonId)));
    } catch (err) {
      console.error("Failed to delete lesson:", err);
      setError(err instanceof Error ? err.message : 'Failed to delete lesson.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col relative z-10">
        <nav className="bg-brightgrants-navy text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BrightGrantsRobot size="sm" className="w-10 h-10" />
              <h1 className="text-xl font-bold">Bright Grants</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="badge-level">Organization</span>
              <span>Welcome, {user?.name || 'Organization'}</span>
              <button
                onClick={handleLogout}
                className="bg-brightgrants-blue px-3 py-1 rounded-lg hover:bg-brightgrants-blue/80 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Sidebar Component */}
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        {/* Main Content Component */}
        {isLoading && (
          <div className="flex-grow p-6 ml-64 text-center">Loading dashboard data...</div>
        )}
        {error && (
          <div className="flex-grow p-6 ml-64 text-center text-red-500">Error: {error}</div>
        )}
        {!isLoading && !error && (
          <MainContent
            activeView={activeView}
            lessonsData={lessonsData}
            setLessonsData={setLessonsData} // Still needed for local manipulations like drag-and-drop
            onAddLesson={handleAddLesson}
            onEditLesson={handleEditLesson}
            onDeleteLesson={handleDeleteLesson}
          />
        )}
      </div>
    </GameBackground>
  );
};

export default OrganizationDashboard;
