// src/pages/StudentLogin.tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../services/api";
import GameBackground from "../components/GameBackground";
import BrightBoostRobot from "../components/BrightBoostRobot";

const studentLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password needs to be at least 6 characters"),
});

type StudentLoginFormData = z.infer<typeof studentLoginSchema>;

const StudentLogin: React.FC = () => {
  const [error, setError] = useState("");
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: StudentLoginFormData) => {
    try {
      const response = await loginUser(
        studentLoginSchema.parse(data).email,
        studentLoginSchema.parse(data).password,
      );

      // Verify this is a student account
      if (response.user.role !== "STUDENT" && response.user.role !== "student") {
        setError(
          "This login is only for students. Please use the teacher login if you are a teacher.",
        );
        return;
      }
      localStorage.setItem("jwt", response.token);
      login(response.token, response.user, "/student/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to login. Please check your credentials.",
      );
    }
  };

  return (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl">
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-brightboost-navy mb-4">
              Student Login
            </h1>
            <p className="text-lg text-brightboost-navy mb-6">
              Ready to continue your learning adventure?
            </p>
            <BrightBoostRobot className="hidden md:block" />
          </div>

          <div className="game-card p-6 flex-1 w-full max-w-md">
            <BrightBoostRobot className="md:hidden mx-auto mb-6" size="sm" />

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  {...register("email")}
                  className={`w-full px-4 py-2 bg-white border-2 ${
                    errors.email
                      ? "border-red-500"
                      : "border-brightboost-lightblue"
                  } text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
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
                  {...register("password")}
                  className={`w-full px-4 py-2 bg-white border-2 ${
                    errors.password
                      ? "border-red-500"
                      : "border-brightboost-lightblue"
                  } text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all`}
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`button-shadow w-full py-3 px-4 rounded-xl text-white font-bold ${
                  isSubmitting
                    ? "bg-brightboost-lightblue/70"
                    : "bg-brightboost-lightblue"
                } transition-colors`}
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-brightboost-navy">
                Don't have an account?{" "}
                <Link
                  to="/student/signup"
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
      </div>
    </GameBackground>
  );
};

export default StudentLogin;
