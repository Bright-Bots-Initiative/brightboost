import React from 'react';
import { SidebarProps } from './types';

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const navItems = ["Lessons", "Students", "Settings"];
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-6 space-y-4 fixed top-0 left-0 shadow-lg">
      <h2 className="text-2xl font-semibold mb-6 text-center">Teacher Admin</h2>
      <nav>
        {navItems.map((item) => (
          <a
            key={item}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveView(item);
            }}
            className={`block py-3 px-4 rounded-lg transition duration-200 ease-in-out text-sm font-medium
                        hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${activeView === item ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300'
            }`}
          >
            {item}
          </a>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
