// src/components/ui/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const { user, isAuthenticated, login, logout } = useAuth();

  return (
    <nav className={`bg-${user?.role === 'teacher' ? 'blue' : 'purple'}-600 text-white p-4 ${className}`}>
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          Playful Peer Platform
        </Link>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <span>Welcome, {user?.name || user?.email}!</span>
              <button
                onClick={logout}
                className={`bg-${user?.role === 'teacher' ? 'blue' : 'purple'}-700 px-3 py-1 rounded hover:bg-${user?.role === 'teacher' ? 'blue' : 'purple'}-800 transition-colors`}
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={login}
                className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800 transition-colors"
              >
                Sign In with GitHub
              </button>
              <button
                onClick={() => window.location.href = '/.auth/login/aad'}
                className="bg-green-700 px-3 py-1 rounded hover:bg-green-800 transition-colors"
              >
                Sign In with Microsoft
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
