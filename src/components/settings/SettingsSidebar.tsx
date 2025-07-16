import { NavLink } from 'react-router-dom';
import { User, Settings } from 'lucide-react';

export default function SettingsSidebar() {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="w-5 h-5 text-brightboost-blue" />
        <h2 className="text-lg font-semibold text-brightboost-navy">Settings</h2>
      </div>
      
      <nav className="space-y-1">
        <NavLink 
          to="/teacher/settings/profile"
          className={({ isActive }) => 
            `flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
              isActive 
                ? 'bg-brightboost-blue text-white shadow-md' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-brightboost-navy'
            }`
          }
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </NavLink>
        
        {/* Placeholder for future settings */}
        <div className="pt-4 border-t border-gray-200 mt-4">
          <p className="text-xs text-gray-500 px-3 mb-2">More settings coming soon</p>
          <div className="space-y-1">
            <button className="flex items-center space-x-3 px-3 py-2 text-gray-400 cursor-not-allowed w-full text-left" disabled>
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span className="text-sm">Notifications</span>
            </button>
            <button className="flex items-center space-x-3 px-3 py-2 text-gray-400 cursor-not-allowed w-full text-left" disabled>
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span className="text-sm">Privacy</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}