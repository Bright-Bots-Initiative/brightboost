// src/pages/TeacherSignup.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { signupTeacher } from "../services/api";
import GameBackground from "../components/GameBackground";
import BrightBoostRobot from "../components/BrightBoostRobot";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";

const TeacherSignup: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting to sign up teacher:", { name, email });
      const response = await signupTeacher(name, email, password);
      console.log("Signup successful:", response);

      // Auto login after successful signup
      if (response && response.token) {
        login(response.token, response.user);
      } else {
        console.error("Invalid response format:", response);
        setError("Server returned an invalid response format");
      }
    } catch (err: unknown) {
      console.error("Signup error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to sign up. Please try again.",
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
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl">
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-brightboost-navy mb-4">
              Join as a Teacher
            </h1>
            <p className="text-lg text-brightboost-navy mb-6">
              Share your knowledge and inspire the next generation
            </p>
            <BrightBoostRobot className="hidden md:block" />
          </div>

          <div className="game-card p-6 flex-1 w-full max-w-md">
            <BrightBoostRobot className="md:hidden mx-auto mb-6" size="sm" />

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
                label="Full Name"
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClasses}
                placeholder="Enter your full name"
              />

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
                placeholder="Create a password"
              />

              <PasswordInput
                label="Confirm Password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={inputClasses}
                placeholder="Confirm your password"
              />

              <button
                type="submit"
                disabled={isLoading}
                className={`button-shadow w-full py-3 px-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 ${
                  isLoading ? "bg-brightboost-blue/70" : "bg-brightboost-blue"
                } transition-colors`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing up...</span>
                  </>
                ) : (
                  "Sign Up"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-brightboost-navy">
                Already have an account?{" "}
                <Link
                  to="/teacher/login"
                  className="text-brightboost-blue font-bold hover:underline transition-colors"
                >
                  Log in
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
      </div>
    </GameBackground>
  );
};

export default TeacherSignup;
