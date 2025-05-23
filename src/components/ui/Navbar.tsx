// src/components/ui/Navbar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={`bg-${user?.role === 'teacher' ? 'blue' : 'purple'}-600 text-white p-4 ${className}`}>
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          Playful Peer Platform
        </Link>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <span>Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className={`bg-${user?.role === 'teacher' ? 'blue' : 'purple'}-700 px-3 py-1 rounded hover:bg-${user?.role === 'teacher' ? 'blue' : 'purple'}-800 transition-colors`}
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex space-x-2">
              <Link
                to="/teacher/login"
                className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800 transition-colors"
              >
                Teacher Login
              </Link>
              <Link
                to="/student/login"
                className="bg-purple-700 px-3 py-1 rounded hover:bg-purple-800 transition-colors"
              >
                Student Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
