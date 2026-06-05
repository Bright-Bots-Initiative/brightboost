import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../services/api";
import LoginCard, { LoginInput, LoginButton, LoginSection } from "@/components/auth/LoginCard";

const TeacherLogin: React.FC = () => {
  const { t } = useTranslation();
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

      {/* New users — make the signup path obvious */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center">
        <p className="text-sm text-slate-700">
          {t("auth.noAccount", { defaultValue: "Don't have an account?" })}
        </p>
        <Link
          to="/teacher/signup"
          className="mt-2 inline-flex items-center justify-center w-full px-4 py-3 min-h-[44px] rounded-lg bg-white border-2 border-indigo-500 text-indigo-700 font-semibold text-sm hover:bg-indigo-100 active:scale-[0.99] transition-all"
        >
          {t("auth.signUpFree", { defaultValue: "Sign up free" })}
        </Link>
        <p className="text-xs text-slate-500 mt-2">
          {t("auth.signupCtaSubtitle", {
            defaultValue: "It's free — get started in under a minute.",
          })}
        </p>
      </div>

      <div className="text-center">
        <Link to="/forgot-password" className="block text-sm text-indigo-600 hover:underline">Forgot password?</Link>
      </div>
    </LoginCard>
  );
};

export default TeacherLogin;
