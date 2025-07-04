import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { name: "Lessons", path: "/teacher/dashboard" },
  { name: "Students", path: "/teacher/students" },
  { name: "Classes", path: "/teacher/classes" },
  { name: "Settings", path: "/teacher/settings" },
];

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-6 space-y-4 fixed top-0 left-0 shadow-lg">
      <h2 className="text-2xl font-semibold mb-6 text-center">Teacher Admin</h2>
      <nav>
        {navItems.map(({ name, path }) => (
          <NavLink
            key={name}
            to={path}
            className={({ isActive }) =>
              `block py-3 px-4 rounded-lg transition duration-200 ease-in-out text-sm font-medium
              hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActive ? "bg-blue-600 text-white shadow-md" : "text-gray-300"
              }`
            }
          >
            {name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
