
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GameBackground from '../components/GameBackground';
import BrightBoostRobot from '../components/BrightBoostRobot';
import Sidebar from '../components/TeacherDashboard/Sidebar';
import MainContent from '../components/TeacherDashboard/MainContent';
import { Lesson } from '../components/TeacherDashboard/types';

interface Class {
  id: string;
  name: string;
  students: number;
  schedule: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  submissions: number;
}

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<string>('Lessons');
  // Using useState but ignoring setters for now - will be used in future features
  const [isLoading] = React.useState(false);
  const [classes] = React.useState<Class[]>([
    { id: '1', name: 'Math 101', students: 25, schedule: 'MWF 10:00 AM' },
    { id: '2', name: 'Science 202', students: 30, schedule: 'TTh 2:00 PM' }
  ]);
  const [assignments] = React.useState<Assignment[]>([
    { id: '1', title: 'Algebra Quiz', dueDate: '2025-04-10', submissions: 15 },
    { id: '2', title: 'Science Project', dueDate: '2025-04-20', submissions: 8 }
  ]);
  const [lessonsData, setLessonsData] = useState<Lesson[]>([
    { id: '1', title: 'Introduction to Algebra', category: 'Math', date: '2025-05-01', status: 'Published' },
    { id: '2', title: 'Advanced Geometry', category: 'Math', date: '2025-05-10', status: 'Draft' },
    { id: '3', title: 'Chemistry Basics', category: 'Science', date: '2025-05-15', status: 'Review' }
  ]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col relative z-10">
        <nav className="bg-brightboost-navy text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BrightBoostRobot size="sm" className="w-10 h-10" />
              <h1 className="text-xl font-bold">Bright Boost</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="badge-level">Teacher</span>
              <span>Welcome, {user?.name || 'Teacher'}</span>
              <button
                onClick={handleLogout}
                className="bg-brightboost-blue px-3 py-1 rounded-lg hover:bg-brightboost-blue/80 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Sidebar Component */}
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        {/* Main Content Component */}
        <MainContent 
          activeView={activeView} 
          lessonsData={lessonsData} 
          setLessonsData={setLessonsData} 
        />
      </div>
    </GameBackground>
  );
};

export default TeacherDashboard;
