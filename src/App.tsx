// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import TeacherLayout from "./components/TeacherDashboard/TeacherLayout";
import TeacherClasses from "./pages/TeacherClasses";
import TeacherClassDetail from "./pages/TeacherClassDetail";
import TeacherSettings from "./pages/TeacherSettings";
import TeacherStudentRoster from "./pages/TeacherStudentRoster";
import JoinClass from "./pages/JoinClass";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import TeacherModulePrep from "./pages/TeacherModulePrep";
import TeacherResources from "./pages/TeacherResources";
import TeacherPDHub from "./pages/TeacherPDHub";
import CommunityImpactDashboard from "./pages/CommunityImpactDashboard";
import ShowcaseMode from "./pages/ShowcaseMode";
import StudentClassLogin from "./pages/StudentClassLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ForReviewers from "./pages/ForReviewers";
import StudentBenchmark from "./pages/StudentBenchmark";
import StudentSettings from "./pages/StudentSettings";

// Pathways (secondary-age program layer)
import PathwaysLayout from "./components/pathways/PathwaysLayout";
import PathwaysHome from "./components/pathways/PathwaysHome";
import TracksOverview from "./components/pathways/TracksOverview";
import TrackDetail from "./components/pathways/TrackDetail";
import ModulePlayer from "./components/pathways/ModulePlayer";
import PathwaysProfile from "./components/pathways/PathwaysProfile";
import FacilitatorDashboard from "./components/pathways/FacilitatorDashboard";
import PathwaysAbout from "./components/pathways/PathwaysAbout";

// Import styles
import "./App.css";

// Layout Wrappers
const StudentRoot = () => (
  <StudentLayout>
    <Outlet />
  </StudentLayout>
);

const TeacherRoot = () => (
  <TeacherLayout>
    <Outlet />
  </TeacherLayout>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <TooltipProvider>
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
              <Route path="/class-login" element={<StudentClassLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/showcase" element={<ShowcaseMode isPublic />} />
              <Route path="/for-reviewers" element={<ForReviewers />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />

              {/* Protected Teacher routes (nested) */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherRoot />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="classes" element={<TeacherClasses />} />
                <Route path="classes/:id" element={<TeacherClassDetail />} />
                <Route path="students" element={<TeacherStudentRoster />} />
                <Route path="prep/:slug" element={<TeacherModulePrep />} />
                <Route path="resources" element={<TeacherResources />} />
                <Route path="pd" element={<TeacherPDHub />} />
                <Route path="settings" element={<TeacherSettings />} />
                <Route path="impact" element={<CommunityImpactDashboard />} />
                <Route path="showcase" element={<ShowcaseMode />} />
              </Route>

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
                <Route path="join" element={<JoinClass />} />
                <Route path="avatar" element={<Avatar />} />
                <Route path="play" element={<PlayHub />} />
                <Route path="settings" element={<StudentSettings />} />
                <Route path="benchmark/:assignmentId" element={<StudentBenchmark />} />
                <Route
                  path="arena"
                  element={<Navigate to="/student/play?tab=pvp" replace />}
                />
              </Route>

              {/* Pathways: public landing page */}
              <Route path="/pathways/about" element={<PathwaysAbout />} />

              {/* Pathways: authenticated routes */}
              <Route path="/pathways" element={<ProtectedRoute><PathwaysLayout /></ProtectedRoute>}>
                <Route index element={<PathwaysHome />} />
                <Route path="tracks" element={<TracksOverview />} />
                <Route path="tracks/:trackSlug" element={<TrackDetail />} />
                <Route path="tracks/:trackSlug/:moduleSlug" element={<ModulePlayer />} />
                <Route path="profile" element={<PathwaysProfile />} />
                <Route path="facilitator" element={<FacilitatorDashboard />} />
              </Route>

              {/* Legacy Redirects for Flat Routes (if any external links exist) */}
              <Route
                path="/modules"
                element={<Navigate to="/student/modules" />}
              />
              <Route
                path="/avatar"
                element={<Navigate to="/student/avatar" />}
              />
              <Route
                path="/arena"
                element={<Navigate to="/student/play?tab=pvp" />}
              />

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>

            {import.meta.env.VITE_APP_VERSION ? (
              <div className="fixed right-2 bottom-2 opacity-60 text-xs pointer-events-none">
                v{import.meta.env.VITE_APP_VERSION}
              </div>
            ) : null}
          </div>
        </TooltipProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
