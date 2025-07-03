// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Suspense, lazy } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import { Toaster } from "@/components/ui/toaster";

// Import pages and components
import Index from "./pages/Index";
const ENABLE_I18N = import.meta.env.VITE_ENABLE_I18N === 'true';

const TeacherLogin = lazy(() => import("./pages/TeacherLogin"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TeacherSignup = lazy(() => import("./pages/TeacherSignup"));
const StudentLogin = lazy(() => import("./pages/StudentLogin"));
const StudentSignup = lazy(() => import("./pages/StudentSignup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginSelection = lazy(() => import("./pages/LoginSelection"));
const SignupSelection = lazy(() => import("./pages/SignupSelection"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const QuestRouter = lazy(() => import("./pages/quests/QuestRouter"));

import LoadingSpinner from "./components/LoadingSpinner";
import "./App.css";

function App() {
  const renderApp = (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginSelection />} />
        <Route path="/signup" element={<SignupSelection />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/teacher/signup" element={<TeacherSignup />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/signup" element={<StudentSignup />} />
        <Route path="/quest/:id" element={<QuestRouter />} />

        {/* Protected routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );

  // Conditional rendering based on i18n setting (ENABLE_I18N)
  const appContent = ENABLE_I18N ? (
    <I18nextProvider i18n={i18n}>{renderApp}</I18nextProvider>
  ) : (
    renderApp
  );

  return (
    <>
      <Router>
        <AuthProvider>
          <div className="app">{appContent}</div>
        </AuthProvider>
      </Router>

      {/* Toaster will always appear */}
      <Toaster />

      {/* Footer with build timestamp */}
      <footer
        style={{
          textAlign: "center",
          fontSize: "0.8rem",
          margin: "1rem 0",
          padding: "0.5rem",
          color: "#666",
          borderTop: "1px solid #eee",
        }}
      >
        BrightBoost v1.3.0 – Build:{" "}
        {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
      </footer>
    </>
  );
}

export default App;
