// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { join } from "../services/api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  xp?: number;
  level?: string;
  streak?: number;
  avatarUrl?: string | null;
  badges?: Array<{ id: string; name: string; awardedAt: string }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User, next?: string) => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Export the context so it can be used in tests
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

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
    const storedToken = localStorage.getItem("bb_access_token");

    if (storedToken) {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(userData);
      setToken(storedToken);

      // ⚡ Bolt Optimization: Exclude progress data to speed up session check
      fetch(join(API_BASE, "/get-progress?excludeProgress=true"), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
      })
        .then(async (res) => {
          if (!res.ok) {
            setUser(null);
            localStorage.removeItem("user");
            localStorage.removeItem("bb_access_token");
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
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (token: string, userData: User, next?: string) => {
    if (token) localStorage.setItem("bb_access_token", token);
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
    localStorage.removeItem("bb_access_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    navigate("/");
  }, [navigate]);

  /**
   * Update user state partially (e.g., after avatar upload).
   * Updates both React state and localStorage.
   */
  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
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
