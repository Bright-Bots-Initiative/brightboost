// src/components/TeacherDashboard/TeacherNavbar.tsx
import React, { useState } from "react";
import BrightBoostRobot from "../BrightBoostRobot";
import { LogOut, User, ChevronDown } from "lucide-react";

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
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav 
      className="bg-brightboost-navy text-white shadow-lg ml-64" 
      role="navigation" 
      aria-label="Main navigation"
    >
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left side - Logo */}
          <div className="flex items-center gap-3">
            <BrightBoostRobot size="sm" className="w-10 h-10" />
            <h1 className="text-xl font-bold tracking-wide">Bright Boost</h1>
          </div>

          {/* Right side - User menu */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-brightboost-blue/20 transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-light"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              aria-label={`User menu for ${userName}`} // Added aria-label
            >
              <div className="w-8 h-8 bg-brightboost-light rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-brightboost-navy" />
              </div>
              <span className="font-medium">Welcome, {userName}</span> {/* Added "Welcome, " */}
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                role="menu"
                aria-labelledby="user-menu-button"
              >
                <button
                  onClick={() => {
                    onProfileClick();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors focus:outline-none focus:bg-gray-50"
                  role="menuitem"
                >
                  <User className="w-4 h-4" />
                  View Profile
                </button>
                <button
                  onClick={() => {
                    onEditProfileClick();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors focus:outline-none focus:bg-gray-50"
                  role="menuitem"
                >
                  <User className="w-4 h-4" />
                  Edit Profile
                </button>
                <hr className="my-2 border-gray-200" role="separator" />
                <button
                  onClick={() => {
                    onLogout();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors focus:outline-none focus:bg-red-50"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TeacherNavbar;
