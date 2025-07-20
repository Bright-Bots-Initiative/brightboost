import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
//import { useApi } from "../services/api";
import GameBackground from "../GameBackground";
//import BrightBoostRobot from "../components/BrightBoostRobot";
import Sidebar from "./Sidebar";
import TeacherNavbar from "./TeacherNavbar";
import ProfileModal from "./ProfileModal";
import EditProfileModal from "./EditProfileModal";
import { useState } from "react";
import { UserProfile } from "@/services/profileService";

const TeacherLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

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
        <TeacherNavbar
          userName={user?.name || "Teacher"}
          onLogout={handleLogout}
          onProfileClick={handleProfileClick}
          onEditProfileClick={handleEditProfileClick}
        />
        <Sidebar />
        <main className="flex-grow ml-64 p-6">{children}</main>
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
