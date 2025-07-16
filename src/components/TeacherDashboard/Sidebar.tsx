import React from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, Users, GraduationCap, Settings } from "lucide-react";

const navItems = [
  { name: "Lessons", path: "/teacher/dashboard", icon: BookOpen },
  { name: "Students", path: "/teacher/students", icon: Users },
  { name: "Classes", path: "/teacher/classes", icon: GraduationCap },
  { name: "Settings", path: "/teacher/settings", icon: Settings },
];

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-6 space-y-4 fixed top-0 left-0 shadow-lg">
      <h2 className="text-2xl font-semibold mb-6 text-center">Teacher Admin</h2>
      <nav>
        {navItems.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={name}
            to={path}
            className={({ isActive }) =>
              `flex items-center space-x-3 py-3 px-4 rounded-lg transition duration-200 ease-in-out text-sm font-medium
              hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActive ? "bg-blue-600 text-white shadow-md" : "text-gray-300"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
export default Sidebar;