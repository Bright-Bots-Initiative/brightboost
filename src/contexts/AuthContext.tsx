// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
const API_BASE =
  import.meta.env.VITE_AWS_API_URL ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "";
import { useNavigate, useLocation } from "react-router-dom";

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
  login: (token: string, userData: User, next?: string) => void;
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
  const location = useLocation();
  const [nextPath, setNextPath] = useState<string | undefined>(undefined);

  useEffect(() => {
    const storedToken = localStorage.getItem("brightboost_token");
    if (storedToken) {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(userData);
      setToken(storedToken);
    }

    fetch(`${API_BASE}/api/get-progress`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          setUser(null);
          localStorage.removeItem("user");
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = (token: string, userData: User, next?: string) => {
    if (token) localStorage.setItem("brightboost_token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    setToken(token || null);
    setUser(userData);
    setNextPath(next);
    setShouldRedirect(true);
  };

  useEffect(() => {
    if (user && !isLoading && shouldRedirect) {
      const byRole =
        user.role === "TEACHER" || user.role === "teacher"
          ? "/teacher/dashboard"
          : "/student/dashboard";
      const params = new URLSearchParams(location.search);
      const nextParam = params.get("next") || undefined;
      const target = nextPath ?? nextParam ?? byRole ?? "/";
      navigate(target);
      setShouldRedirect(false);
      setNextPath(undefined);
    }
  }, [user, isLoading, shouldRedirect, nextPath, location.search, navigate]);

  const logout = useCallback(() => {
    // Remove token and user data from localStorage
    localStorage.removeItem("brightboost_token");
    localStorage.removeItem("user");

    // Update state
    setToken(null);
    setUser(null);

    // Redirect to home page
    navigate("/");
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user,
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
