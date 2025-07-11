// components/TeacherDashboard/TeacherNavbar.tsx
import React from "react";
import BrightBoostRobot from "../BrightBoostRobot";

interface TeacherNavbarProps {
  userName: string;
  onLogout: () => void;
}

const TeacherNavbar: React.FC<TeacherNavbarProps> = ({
  userName,
  onLogout,
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
