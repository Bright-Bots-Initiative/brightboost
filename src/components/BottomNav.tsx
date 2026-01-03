// src/components/BottomNav.tsx
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Bot, Swords } from "lucide-react";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: "Learn",
      icon: BookOpen,
      path: "/student/modules",
      testId: "nav-learn",
    },
    {
      label: "My Bot",
      icon: Bot,
      path: "/student/avatar",
      testId: "nav-avatar",
    },
    {
      label: "Play",
      icon: Swords,
      path: "/student/play",
      testId: "nav-play",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 pb-6 md:pb-2 flex justify-around items-center z-50">
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.label}
            data-testid={item.testId}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center p-2 rounded-lg w-full ${
              isActive
                ? "text-blue-600 bg-blue-50"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-xs font-bold mt-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
