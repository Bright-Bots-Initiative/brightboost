// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

// Import pages
import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherSignup from "./pages/TeacherSignup";
import StudentLogin from "./pages/StudentLogin";
import StudentSignup from "./pages/StudentSignup";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginSelection from "./pages/LoginSelection";
import SignupSelection from "./pages/SignupSelection";
import Index from "./pages/Index";
import Modules from "./pages/Modules";
import ModuleDetail from "./pages/ModuleDetail";
import Avatar from "./pages/Avatar";
import PlayHub from "./pages/PlayHub";
import ActivityPlayer from "./pages/ActivityPlayer";
import StudentLayout from "./layouts/StudentLayout";

// Import styles
import "./App.css";

// Layout Wrapper
const StudentRoot = () => (
  <StudentLayout>
    <Outlet />
  </StudentLayout>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginSelection />} />
            <Route path="/signup" element={<SignupSelection />} />
            <Route path="/teacher/login" element={<TeacherLogin />} />
            <Route path="/teacher/signup" element={<TeacherSignup />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/signup" element={<StudentSignup />} />

            {/* Protected Teacher routes */}
            <Route
              path="/teacher/dashboard"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Student Routes (Nested) */}
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentRoot />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="modules" element={<Modules />} />
              <Route path="modules/:slug" element={<ModuleDetail />} />
              <Route
                path="modules/:slug/lessons/:lessonId/activities/:activityId"
                element={<ActivityPlayer />}
              />
              <Route path="avatar" element={<Avatar />} />
              <Route path="play" element={<PlayHub />} />
              <Route path="arena" element={<Navigate to="/student/play?tab=pvp" replace />} />
            </Route>

            {/* Legacy Redirects for Flat Routes (if any external links exist) */}
            <Route
              path="/modules"
              element={<Navigate to="/student/modules" />}
            />
            <Route path="/avatar" element={<Navigate to="/student/avatar" />} />
            <Route path="/arena" element={<Navigate to="/student/play?tab=pvp" />} />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          {import.meta.env.VITE_APP_VERSION ? (
            <div className="fixed right-2 bottom-2 opacity-60 text-xs pointer-events-none">
              v{import.meta.env.VITE_APP_VERSION}
            </div>
          ) : null}
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
