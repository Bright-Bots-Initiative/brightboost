import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../services/api";
import GameBackground from "../components/GameBackground";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { Button } from "../components/ui/button";

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

  const inputClasses =
    "bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:ring-brightboost-blue focus:border-transparent";

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
            <Input
              label="Email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClasses}
              placeholder="Enter your email"
            />

            <PasswordInput
              label="Password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClasses}
              placeholder="Enter your password"
            />

            <Button
              type="submit"
              isLoading={isLoading}
              loadingText="Logging in..."
              className="button-shadow w-full py-3 px-4 rounded-xl text-white font-bold ui-lift bg-brightboost-blue hover:bg-brightboost-blue/90"
            >
              Login
            </Button>
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
