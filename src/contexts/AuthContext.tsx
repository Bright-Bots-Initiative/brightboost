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
    console.log("AuthContext.login called:", { token: token?.substring(0, 20) + "...", userData, route: window.location.pathname });
    
    // Store token and user data in localStorage
    localStorage.setItem("brightboost_token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    // Update state
    setToken(token);
    setUser(userData);
    setShouldRedirect(true);
    
    console.log("AuthContext.login completed - state updated, shouldRedirect:", true);
  };

  useEffect(() => {
    if (user && token && !isLoading && shouldRedirect) {
      console.log("AuthContext navigation triggered:", { userRole: user.role, currentPath: window.location.pathname });
      
      if (user.role === "TEACHER" || user.role === "teacher") {
        console.log("Navigating to /teacher/dashboard");
        navigate("/teacher/dashboard");
      } else if (user.role === "STUDENT" || user.role === "student") {
        console.log("Navigating to /student/dashboard");
        navigate("/student/dashboard");
      }
      setShouldRedirect(false);
      
      console.log("AuthContext navigation completed, shouldRedirect set to false");
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
