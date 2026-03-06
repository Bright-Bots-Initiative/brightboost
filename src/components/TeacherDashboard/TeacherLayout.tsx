import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Sidebar from "./Sidebar";
import TeacherNavbar from "./TeacherNavbar";
import ProfileModal from "./ProfileModal";
import EditProfileModal from "./EditProfileModal";
import { useState, useEffect, useRef, useCallback } from "react";
import { UserProfile } from "@/services/profileService";
import { Menu } from "lucide-react";

const SIDEBAR_KEY = "teacher-sidebar-collapsed";

function getDefaultCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) return stored === "true";
  } catch {}
  // Default collapsed on tablet (<1024px)
  return window.innerWidth < 1024;
}

const TeacherLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Sidebar state
  const [collapsed, setCollapsed] = useState(getDefaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // This will be handled by the navbar component now
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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

  const handleProfileUpdated = (_profile: UserProfile) => {
    // Profile updated — no-op; parent re-fetches as needed
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-brightboost-blue text-white px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 z-30 p-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Sidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Right column: navbar + content */}
        <div
          className={`flex flex-col flex-1 transition-[margin-left] duration-200 ease-in-out ml-0 ${
            collapsed ? "md:ml-[60px]" : "md:ml-64"
          }`}
        >
          <TeacherNavbar
            userName={user?.name || "Teacher"}
            avatarUrl={user?.avatarUrl}
            onLogout={handleLogout}
            onProfileClick={handleProfileClick}
            onEditProfileClick={handleEditProfileClick}
          />
          <main
            id="main-content"
            className="flex-grow pt-6 px-6 pb-6 bg-white"
            role="main"
          >
            {children}
          </main>
        </div>
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
    </div>
  );
};

export default TeacherLayout;
