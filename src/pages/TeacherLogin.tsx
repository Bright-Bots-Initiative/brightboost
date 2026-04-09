import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../services/api";
import LoginCard, { LoginInput, LoginButton, LoginSection } from "@/components/auth/LoginCard";

const TeacherLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await loginUser(email, password);
      if (response.user.role !== "TEACHER" && response.user.role !== "teacher") {
        setError("This login is for teachers. Students should use the student login.");
        setIsLoading(false);
        return;
      }
      // Let AuthContext handle routing (teacher dashboard or pathways facilitator)
      login(response.token, response.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginCard icon="👩‍🏫" title="Teacher Login" subtitle="Sign in with your email and password">
      <LoginSection>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <LoginInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="teacher@school.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
            <LoginInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <LoginButton type="submit" loading={isLoading} disabled={isLoading}>
            {isLoading ? "Signing in..." : "Log In"}
          </LoginButton>
        </form>
      </LoginSection>

      <div className="text-center space-y-2">
        <Link to="/forgot-password" className="block text-sm text-indigo-600 hover:underline">Forgot password?</Link>
        <p className="text-xs text-slate-400">
          Don't have an account? <Link to="/teacher/signup" className="text-indigo-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </LoginCard>
  );
};

export default TeacherLogin;
