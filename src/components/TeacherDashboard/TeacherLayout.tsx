import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import GameBackground from "../GameBackground";
import Sidebar from "./Sidebar";
import TeacherNavbar from "./TeacherNavbar";
import ProfileModal from "./ProfileModal";
import EditProfileModal from "./EditProfileModal";
import { useState, useEffect, useRef } from "react";
import { UserProfile } from "@/services/profileService";

const TeacherLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // This will be handled by the navbar component now
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleEditProfileClick = () => {
    setIsEditProfileModalOpen(true);
  };

  const handleProfileUpdated = (profile: UserProfile) => {
    console.log("Profile updated:", profile);
  };

  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col relative z-10">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-brightboost-blue text-white px-4 py-2 rounded-md z-50">
          Skip to main content
        </a>
        <TeacherNavbar
          userName={user?.name || "Teacher"}
          onLogout={handleLogout}
          onProfileClick={handleProfileClick}
          onEditProfileClick={handleEditProfileClick}
        />
        <Sidebar />
        <main id="main-content" className="flex-grow ml-64 pt-6 px-6 pb-6" role="main">
          {children}
        </main>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        isTeacherProfile
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />
    </GameBackground>
  );
};

export default TeacherLayout;