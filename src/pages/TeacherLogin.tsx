import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../services/api";
import GameBackground from "../components/GameBackground";

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
      // Verify this is a teacher account
      if (response.user.role !== "TEACHER") {
        setError(
          "This login is only for teachers. Please use the student login if you are a student.",
        );
        setIsLoading(false);
        return;
      }
      login(response.token, response.user);
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
        <div className="game-card p-6 w-full max-w-md">
          <div className="flex items-center gap-2 mb-4">
            <Link
              to="/login"
              className="text-brightboost-blue hover:text-brightboost-navy"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-brightboost-navy">
              Teacher Login
            </h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
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
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`button-shadow w-full py-3 px-4 rounded-xl text-white font-bold ${
                isLoading ? "bg-brightboost-blue/70" : "bg-brightboost-blue"
              } transition-colors`}
            >
              {isLoading ? "Logging in..." : "Login"}
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
