// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  xp?: number;
  level?: string;
  streak?: number;
  badges?: Array<{ id: string; name: string; awardedAt: string }>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shouldRedirect, setShouldRedirect] = useState<boolean>(false);
  const navigate = useNavigate();

  // Check if token exists in localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("brightboost_token");

    if (storedToken) {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(userData);
      setToken(storedToken);
    }

    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    // Store token and user data in localStorage
    localStorage.setItem("brightboost_token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    // Update state
    setToken(token);
    setUser(userData);
    setShouldRedirect(true);
  };

  useEffect(() => {
    if (user && token && !isLoading && shouldRedirect) {
      if (user.role === "TEACHER" || user.role === "teacher") {
        navigate("/teacher/dashboard");
      } else if (user.role === "STUDENT" || user.role === "student") {
        navigate("/student/dashboard");
      }
      setShouldRedirect(false);
    }
  }, [user, token, navigate, isLoading, shouldRedirect]);

  const logout = () => {
    // Remove token and user data from localStorage
    localStorage.removeItem("brightboost_token");
    localStorage.removeItem("user");

    // Update state
    setToken(null);
    setUser(null);

    // Redirect to home page
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
