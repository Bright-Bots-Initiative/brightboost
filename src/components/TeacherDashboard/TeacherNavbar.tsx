// components/TeacherDashboard/TeacherNavbar.tsx
import React from "react";
import BrightBoostRobot from "../BrightBoostRobot";
import { Edit, User } from "lucide-react";

interface TeacherNavbarProps {
  userName: string;
  onLogout: () => void;
  onProfileClick: () => void;
  onEditProfileClick: () => void;
}

const TeacherNavbar: React.FC<TeacherNavbarProps> = ({
  userName,
  onLogout,
  onProfileClick,
  onEditProfileClick,
}) => (
  <nav className="bg-brightboost-navy text-white p-4 shadow-md">
    <div className="container mx-auto flex justify-between items-center">
      <div className="flex items-center gap-3">
        <BrightBoostRobot size="sm" className="w-10 h-10" />
        <h1 className="text-xl font-bold">Bright Boost</h1>
      </div>
      <div className="flex items-center space-x-4">
        <span className="badge-level">Teacher</span>
        <span>Welcome, {userName}</span>
        <button
          onClick={onProfileClick}
          className="flex items-center px-4 py-2 bg-brightboost-green text-white rounded-md hover:bg-green-600 transition-colors shadow-sm hover:shadow-md transform hover:scale-105"
        >
          <User className="w-4 h-4 mr-2" />
          View Profile
        </button>
        <button
          onClick={onEditProfileClick}
          className="flex items-center px-4 py-2 bg-brightboost-yellow text-white rounded-md hover:bg-yellow-600 transition-colors shadow-sm hover:shadow-md transform hover:scale-105"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </button>
        <button
          onClick={onLogout}
          className="bg-brightboost-blue px-3 py-1 rounded-lg hover:bg-brightboost-blue/80 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  </nav>
);

export default TeacherNavbar;
