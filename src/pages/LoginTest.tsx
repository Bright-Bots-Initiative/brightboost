import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginTest: React.FC = () => {
  const { user, login, logout, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8">Loading authentication status...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      
      {isAuthenticated ? (
        <div>
          <p className="mb-4">✅ Authenticated as: {user?.email}</p>
          <p className="mb-4">Roles: {user?.role}</p>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-4">❌ Not authenticated</p>
          <button
            onClick={login}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
          >
            Sign In with GitHub
          </button>
          <button
            onClick={() => window.location.href = '/.auth/login/aad'}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Sign In with Microsoft
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginTest;
