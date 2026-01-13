// src/pages/StudentSignup.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Check, Circle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { signupStudent } from "../services/api";
import GameBackground from "../components/GameBackground";
import BrightBoostRobot from "../components/BrightBoostRobot";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";

const StudentSignup: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const requirements = [
    { re: /.{8,}/, label: "8+ characters" },
    { re: /[A-Z]/, label: "Uppercase letter" },
    { re: /[a-z]/, label: "Lowercase letter" },
    { re: /[0-9]/, label: "Number" },
  ];

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
      // console.log('Attempting to sign up student:', { name, email, role: 'student' });
      const response = await signupStudent(name, email, password);
      // console.log('Signup successful:', response);

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

  const inputClassName =
    "w-full px-4 py-2 bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all";

  return (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl">
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-brightboost-navy mb-4">
              Join as a Student
            </h1>
            <p className="text-lg text-brightboost-navy mb-6">
              Start your learning adventure today!
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
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-brightboost-navy mb-1"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClassName}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-brightboost-navy mb-1"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClassName}
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
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClassName}
                  placeholder="Create a password"
                />
                {password.length > 0 && (
                  <ul
                    className="mt-2 space-y-1"
                    aria-label="Password requirements"
                  >
                    {requirements.map((req, index) => {
                      const isMet = req.re.test(password);
                      return (
                        <li
                          key={index}
                          className={`text-xs flex items-center gap-1.5 ${
                            isMet ? "text-green-600" : "text-slate-500"
                          }`}
                        >
                          {isMet ? (
                            <Check className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <Circle
                              className="w-3 h-3 text-slate-300"
                              aria-hidden="true"
                            />
                          )}
                          <span>{req.label}</span>
                          <span className="sr-only">
                            {isMet ? " - Completed" : " - Incomplete"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-brightboost-navy mb-1"
                >
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={inputClassName}
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`button-shadow w-full py-3 px-4 rounded-xl text-brightboost-navy font-bold flex items-center justify-center gap-2 ${
                  isLoading
                    ? "bg-brightboost-yellow/70"
                    : "bg-brightboost-yellow"
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
                  to="/student/login"
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

export default StudentSignup;
