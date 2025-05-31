// src/pages/TeacherDashboard.tsx

import { useEffect, useState } from 'react';
import Sidebar from '../components/TeacherDashboard/Sidebar';
import MainContent from '../components/TeacherDashboard/MainContent';
import Spinner from '../components/common/Spinner';
import { fetchLessons } from '../api/lessons';
import { Lesson } from '../types/Lesson';

const TeacherDashboard = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    fetchLessons()
      .then((data) => {
        if (isMounted) {
          setLessons(data.lessons || []);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(
            err?.message
              ? `Couldn't load lessons: ${err.message}`
              : 'Could not load lessons from the server. Please try again.'
          );
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gradient-to-b from-blue-100 to-blue-200">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 transition-all duration-300">
        {loading && (
          <div className="flex flex-col items-center justify-center h-96">
            <Spinner />
            <p className="mt-2 text-blue-600">Loading dashboard data...</p>
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-96">
            <p className="text-red-600 mb-4 font-semibold">{error}</p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && lessons.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96">
            <img src="/empty-lessons.svg" alt="No lessons" className="w-40 h-40 mb-4" />
            <p className="text-gray-500 mb-2 font-medium">No lessons yet.</p>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700"
              onClick={() => {/* trigger lesson creation modal/route */}}
            >
              Create your first lesson
            </button>
          </div>
        )}
        {!loading && !error && lessons.length > 0 && (
          <MainContent lessons={lessons} />
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
