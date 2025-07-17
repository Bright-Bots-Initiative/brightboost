import React from 'react';
import { LogOut, User } from 'lucide-react';

interface TeacherNavbarProps {
  userName: string;
  onLogout: () => void;
}

const TeacherNavbar: React.FC<TeacherNavbarProps> = ({
  userName,
  onLogout,
}) => {
  return (
    <nav className="bg-white shadow-md border-b border-gray-200 ml-64 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-brightboost-navy">
            BRIGHT BOOST
          </h1>
          <span className="text-sm text-gray-500">Teacher Dashboard</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {userName}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TeacherNavbar;
