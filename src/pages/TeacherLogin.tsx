import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../services/api";
import GameBackground from "../components/GameBackground";

const TeacherLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await loginUser(email, password);
      // Verify this is a teacher account
      if (
        response.user.role !== "TEACHER" &&
        response.user.role !== "teacher"
      ) {
        setError(
          "This login is only for teachers. Please use the student login if you are a student.",
        );
        setIsLoading(false);
        return;
      }
      login(response.token, response.user, "/teacher/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to login. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
        <div className="game-card p-6 w-full max-w-md ui-sheen ui-highlight">
          <div className="flex items-center gap-2 mb-4">
            <Link
              to="/login"
              className="text-brightboost-blue hover:text-brightboost-navy"
              aria-label="Back to role selection"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-brightboost-navy">
              Teacher Login
            </h1>
          </div>

          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-brightboost-navy mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-brightboost-navy mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brightboost-navy/60 hover:text-brightboost-navy bg-transparent focus:outline-none focus:ring-2 focus:ring-brightboost-blue rounded-full p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className={`button-shadow w-full py-3 px-4 rounded-xl text-white font-bold ui-lift ${
                isLoading ? "bg-brightboost-blue/70" : "bg-brightboost-blue"
              } transition-colors flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-brightboost-navy">
              Don't have an account?{" "}
              <Link
                to="/teacher/signup"
                className="text-brightboost-blue font-bold hover:underline transition-colors"
              >
                Sign up
              </Link>
            </p>
            <p className="text-sm text-brightboost-navy mt-2">
              <Link
                to="/"
                className="text-brightboost-blue font-bold hover:underline transition-colors"
              >
                Back to Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default TeacherLogin;
