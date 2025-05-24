// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  xp?: number;
  level?: string;
  streak?: number;
  badges?: Array<{id: string, name: string, awardedAt: string}>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check if token exists in localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    
    if (storedToken) {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      setToken(storedToken);
    }
    
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    // Store token and user data in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Update state
    setToken(token);
    setUser(userData);
    
    // Redirect based on user role.
    // The setTimeout is a pragmatic approach to allow React state and localStorage updates to settle before navigation.
    // This helps prevent race conditions where navigation might occur before the app fully recognizes the new auth state.
    // TODO: Investigate if this setTimeout can be replaced with a useEffect hook listening to `isAuthenticated` 
    // or `user` state for a more robust navigation trigger post-login. This would require careful handling
    // to ensure navigation occurs only once and to the correct role-based dashboard.
    if (userData.role === 'teacher') {
      setTimeout(() => navigate('/teacher/dashboard'), 100);
    } else if (userData.role === 'student') {
      setTimeout(() => navigate('/student/dashboard'), 100);
    }
  };

  const logout = () => {
    // Remove token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Update state
    setToken(null);
    setUser(null);
    
    // Redirect to home page
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
