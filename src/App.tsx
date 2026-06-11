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
// StudentLogin replaced by LoginSelection at /student-login
import StudentSignup from "./pages/StudentSignup";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginSelection from "./pages/LoginSelection";
import SignupSelection from "./pages/SignupSelection";
import Index from "./pages/Index";
import HomeSectionRedirect from "./pages/HomeSectionRedirect";
import AudiencePlaceholder from "./pages/AudiencePlaceholder";
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
import TryDemo from "./pages/TryDemo";
import StudentBenchmark from "./pages/StudentBenchmark";
import StudentSettings from "./pages/StudentSettings";
import ExperimentDashboard from "./components/admin/ExperimentDashboard";
import AdminMetrics from "./pages/AdminMetrics";

// Pathways (secondary-age program layer)
import PathwaysLayout from "./components/pathways/PathwaysLayout";
import PathwaysHome from "./components/pathways/PathwaysHome";
import TracksOverview from "./components/pathways/TracksOverview";
import TrackDetail from "./components/pathways/TrackDetail";
import ChallengesPage from "./components/pathways/challenges/ChallengesPage";
import ChallengePage from "./components/pathways/challenges/ChallengePage";
import WelcomeAvatarStep from "./components/pathways/onboarding/WelcomeAvatarStep";
import WelcomeSkillsStep from "./components/pathways/onboarding/WelcomeSkillsStep";
import WelcomeMissionStep from "./components/pathways/onboarding/WelcomeMissionStep";
import WelcomeGoalsStep from "./components/pathways/onboarding/WelcomeGoalsStep";
import WelcomeCompleteStep from "./components/pathways/onboarding/WelcomeCompleteStep";
import GlossaryPage from "./components/pathways/glossary/GlossaryPage";
import ModulePlayer from "./components/pathways/ModulePlayer";
import PathwaysProfile from "./components/pathways/PathwaysProfile";
import PathwaysAbout from "./components/pathways/PathwaysAbout";
import ProgramOverviewPage from "./components/pathways/facilitator/ProgramOverview";
import FacilitatorLayout from "./components/pathways/facilitator/FacilitatorLayout";
import FacilitatorDashboardPage from "./components/pathways/facilitator/pages/Dashboard";
import CohortsListPage from "./components/pathways/facilitator/pages/CohortsList";
import CohortNewPage from "./components/pathways/facilitator/pages/CohortNew";
import CohortDetailPage from "./components/pathways/facilitator/pages/CohortDetail";
import FacilitatorTracksPage from "./components/pathways/facilitator/pages/Tracks";
import FacilitatorLearnersPage from "./components/pathways/facilitator/pages/Learners";
import FacilitatorLearnerDetailPage from "./components/pathways/facilitator/pages/LearnerDetail";
import FacilitatorReportsPage from "./components/pathways/facilitator/pages/Reports";
import FacilitatorSettingsPage from "./components/pathways/facilitator/pages/Settings";

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
              <Route path="/teacher-login" element={<TeacherLogin />} />
              <Route path="/student-login" element={<LoginSelection />} />
              <Route path="/class-login" element={<StudentClassLogin />} />
              {/* Legacy redirects for old login routes */}
              <Route path="/login" element={<Navigate to="/student-login" replace />} />
              <Route path="/teacher/login" element={<Navigate to="/teacher-login" replace />} />
              <Route path="/student/login" element={<Navigate to="/student-login" replace />} />
              <Route path="/signup" element={<SignupSelection />} />
              <Route path="/teacher/signup" element={<TeacherSignup />} />
              <Route path="/student/signup" element={<StudentSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/showcase" element={<ShowcaseMode isPublic />} />
              {/* Public zero-signup playable demo — the homepage growth
                  lever from docs/audits/k8-engagement-audit.md Part 3.
                  Must stay outside any auth-gated layout. */}
              <Route path="/try" element={<TryDemo />} />
              <Route path="/for-reviewers" element={<ForReviewers />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/feedback" element={<HomeSectionRedirect sectionId="feedback" />} />
              <Route path="/donate" element={<HomeSectionRedirect sectionId="donation" />} />
              <Route path="/students" element={<AudiencePlaceholder audience="Students" />} />
              <Route path="/teachers" element={<AudiencePlaceholder audience="Teachers" />} />
              <Route path="/parents" element={<AudiencePlaceholder audience="Parents" />} />
              <Route path="/organizations" element={<AudiencePlaceholder audience="Organizations" />} />

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

              {/* Admin: internal A/B testing dashboard — teacher/facilitator only */}
              <Route
                path="/admin/experiments"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <ExperimentDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin: K-8 scoreboard — admin role only */}
              <Route
                path="/admin/metrics"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminMetrics />
                  </ProtectedRoute>
                }
              />

              {/* Pathways: public landing page */}
              <Route path="/pathways/about" element={<PathwaysAbout />} />

              {/* Pathways: Cyber Skills 101 welcome flow — rendered OUTSIDE
                  PathwaysLayout so it has its own minimal chrome. Each step
                  is its own URL so users can bookmark/resume. */}
              <Route path="/pathways/welcome" element={<ProtectedRoute><WelcomeAvatarStep /></ProtectedRoute>} />
              <Route path="/pathways/welcome/skills" element={<ProtectedRoute><WelcomeSkillsStep /></ProtectedRoute>} />
              <Route path="/pathways/welcome/mission" element={<ProtectedRoute><WelcomeMissionStep /></ProtectedRoute>} />
              <Route path="/pathways/welcome/goals" element={<ProtectedRoute><WelcomeGoalsStep /></ProtectedRoute>} />
              <Route path="/pathways/welcome/complete" element={<ProtectedRoute><WelcomeCompleteStep /></ProtectedRoute>} />

              {/* Pathways: student authenticated routes */}
              <Route path="/pathways" element={<ProtectedRoute><PathwaysLayout /></ProtectedRoute>}>
                <Route index element={<PathwaysHome />} />
                <Route path="tracks" element={<TracksOverview />} />
                <Route path="tracks/:trackSlug" element={<TrackDetail />} />
                <Route path="tracks/:trackSlug/:moduleSlug" element={<ModulePlayer />} />
                <Route path="challenges" element={<ChallengesPage />} />
                <Route path="challenges/:slug" element={<ChallengePage />} />
                <Route path="glossary" element={<GlossaryPage />} />
                <Route path="profile" element={<PathwaysProfile />} />
              </Route>

              {/* Pathways: facilitator routes — sibling of /pathways, owns its own
                  layout shell so the student sidebar doesn't render on top. */}
              <Route
                path="/pathways/facilitator"
                element={<ProtectedRoute requiredRole="teacher"><FacilitatorLayout /></ProtectedRoute>}
              >
                <Route index element={<FacilitatorDashboardPage />} />
                <Route path="cohorts" element={<CohortsListPage />} />
                <Route path="cohorts/new" element={<CohortNewPage />} />
                <Route path="cohorts/:id" element={<CohortDetailPage />} />
                <Route path="tracks" element={<FacilitatorTracksPage />} />
                <Route path="learners" element={<FacilitatorLearnersPage />} />
                <Route path="learners/:userId" element={<FacilitatorLearnerDetailPage />} />
                <Route path="reports" element={<FacilitatorReportsPage />} />
                <Route path="resources" element={<ProgramOverviewPage />} />
                <Route path="settings" element={<FacilitatorSettingsPage />} />
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
