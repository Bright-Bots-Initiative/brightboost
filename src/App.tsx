// src/App.tsx
import { lazy, Suspense, type ReactNode } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingScreen } from "./components/RecoveryScreen";
import { Toaster } from "@/components/ui/toaster";

const EchoSpike = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/EchoSpike"))
  : () => null;

// Import pages
const TeacherLogin = lazy(() => import("./pages/TeacherLogin"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TeacherSignup = lazy(() => import("./pages/TeacherSignup"));
// StudentLogin replaced by LoginSelection at /student-login
const StudentSignup = lazy(() => import("./pages/StudentSignup"));
const NotFound = lazy(() => import("./pages/NotFound"));
import ProtectedRoute from "./components/ProtectedRoute";
const LoginSelection = lazy(() => import("./pages/LoginSelection"));
const SignupSelection = lazy(() => import("./pages/SignupSelection"));
const Index = lazy(() => import("./pages/Index"));
const ForTeachers = lazy(() => import("./pages/ForTeachers"));
const ForFamilies = lazy(() => import("./pages/ForFamilies"));
const Donate = lazy(() => import("./pages/Donate"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const AudiencePlaceholder = lazy(() => import("./pages/AudiencePlaceholder"));
const Modules = lazy(() => import("./pages/Modules"));
const ModuleDetail = lazy(() => import("./pages/ModuleDetail"));
const Avatar = lazy(() => import("./pages/Avatar"));
import { SpecialtyProvider } from "./contexts/SpecialtyContext";
const Specialty = lazy(() => import("./pages/Specialty"));
const AdvancedPreview = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/AdvancedPreview"))
  : () => null;
const PlayHub = lazy(() => import("./pages/PlayHub"));
const ActivityPlayer = lazy(() => import("./pages/ActivityPlayer"));
const CreateChallenge = lazy(() => import("./pages/CreateChallenge"));
const ChallengePlayer = lazy(() => import("./pages/ChallengePlayer"));
const StudentGallery = lazy(() => import("./pages/StudentGallery"));
const TeacherGallery = lazy(() => import("./pages/TeacherGallery"));
const StudentLayout = lazy(() => import("./layouts/StudentLayout"));
const TeacherLayout = lazy(
  () => import("./components/TeacherDashboard/TeacherLayout"),
);
const TeacherClasses = lazy(() => import("./pages/TeacherClasses"));
const TeacherClassDetail = lazy(() => import("./pages/TeacherClassDetail"));
const TeacherSettings = lazy(() => import("./pages/TeacherSettings"));
const TeacherStudentRoster = lazy(() => import("./pages/TeacherStudentRoster"));
const JoinClass = lazy(() => import("./pages/JoinClass"));
const StudentClasses = lazy(() => import("./pages/StudentClasses"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const TeacherModulePrep = lazy(() => import("./pages/TeacherModulePrep"));
const TeacherResources = lazy(() => import("./pages/TeacherResources"));
const TeacherPDHub = lazy(() => import("./pages/TeacherPDHub"));
const CommunityImpactDashboard = lazy(
  () => import("./pages/CommunityImpactDashboard"),
);
const ShowcaseMode = lazy(() => import("./pages/ShowcaseMode"));
const StudentClassLogin = lazy(() => import("./pages/StudentClassLogin"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const HomeAccessAccept = lazy(() => import("./pages/HomeAccessAccept"));
const ForReviewers = lazy(() => import("./pages/ForReviewers"));
const TryDemo = lazy(() => import("./pages/TryDemo"));
const GreatWorkDemo = lazy(() => import("./pages/GreatWorkDemo"));
const Waterworks = lazy(() => import("./pages/Waterworks"));
// Biome Buddy prototype: unlisted routes, lazy so its content tables never
// ride in the main chunk.
const BiomeBuddy = lazy(() => import("./pages/BiomeBuddy"));
const BiomeBuddyShare = lazy(() => import("./pages/BiomeBuddyShare"));
const BiomeBuddyReview = lazy(() => import("./pages/BiomeBuddyReview"));
const PlanDetail = lazy(() => import("./pages/PlanDetail"));
const Parents = lazy(() => import("./pages/Parents"));
const ParentGuide = lazy(() => import("./pages/ParentGuide"));
const StudentBenchmark = lazy(() => import("./pages/StudentBenchmark"));
const StudentSettings = lazy(() => import("./pages/StudentSettings"));
const ExperimentDashboard = lazy(
  () => import("./components/admin/ExperimentDashboard"),
);
const AdminMetrics = lazy(() => import("./pages/AdminMetrics"));

// Pathways (secondary-age program layer)
const PathwaysLayout = lazy(
  () => import("./components/pathways/PathwaysLayout"),
);
const PathwaysHome = lazy(() => import("./components/pathways/PathwaysHome"));
const TracksOverview = lazy(
  () => import("./components/pathways/TracksOverview"),
);
const TrackDetail = lazy(() => import("./components/pathways/TrackDetail"));
const ChallengesPage = lazy(
  () => import("./components/pathways/challenges/ChallengesPage"),
);
const ChallengePage = lazy(
  () => import("./components/pathways/challenges/ChallengePage"),
);
const WelcomeAvatarStep = lazy(
  () => import("./components/pathways/onboarding/WelcomeAvatarStep"),
);
const WelcomeSkillsStep = lazy(
  () => import("./components/pathways/onboarding/WelcomeSkillsStep"),
);
const WelcomeMissionStep = lazy(
  () => import("./components/pathways/onboarding/WelcomeMissionStep"),
);
const WelcomeGoalsStep = lazy(
  () => import("./components/pathways/onboarding/WelcomeGoalsStep"),
);
const WelcomeCompleteStep = lazy(
  () => import("./components/pathways/onboarding/WelcomeCompleteStep"),
);
const GlossaryPage = lazy(
  () => import("./components/pathways/glossary/GlossaryPage"),
);
const ModulePlayer = lazy(() => import("./components/pathways/ModulePlayer"));
const PathwaysProfile = lazy(
  () => import("./components/pathways/PathwaysProfile"),
);
const JoinCohort = lazy(() => import("./components/pathways/JoinCohort"));
const PathwaysAbout = lazy(() => import("./components/pathways/PathwaysAbout"));
const ProgramOverviewPage = lazy(
  () => import("./components/pathways/facilitator/ProgramOverview"),
);
const FacilitatorLayout = lazy(
  () => import("./components/pathways/facilitator/FacilitatorLayout"),
);
const FacilitatorDashboardPage = lazy(
  () => import("./components/pathways/facilitator/pages/Dashboard"),
);
const CohortsListPage = lazy(
  () => import("./components/pathways/facilitator/pages/CohortsList"),
);
const CohortNewPage = lazy(
  () => import("./components/pathways/facilitator/pages/CohortNew"),
);
const CohortDetailPage = lazy(
  () => import("./components/pathways/facilitator/pages/CohortDetail"),
);
const FacilitatorTracksPage = lazy(
  () => import("./components/pathways/facilitator/pages/Tracks"),
);
const FacilitatorLearnersPage = lazy(
  () => import("./components/pathways/facilitator/pages/Learners"),
);
const FacilitatorLearnerDetailPage = lazy(
  () => import("./components/pathways/facilitator/pages/LearnerDetail"),
);
const FacilitatorReportsPage = lazy(
  () => import("./components/pathways/facilitator/pages/Reports"),
);
const FacilitatorSettingsPage = lazy(
  () => import("./components/pathways/facilitator/pages/Settings"),
);

const TeachersRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={"/for-teachers" + search} replace />;
};

// Import styles
import "./App.css";

// Layout Wrappers
const StudentRoot = () => (
  <SpecialtyProvider>
    <StudentLayout>
      <Outlet />
    </StudentLayout>
  </SpecialtyProvider>
);

const TeacherRoot = () => (
  <TeacherLayout>
    <Outlet />
  </TeacherLayout>
);

function RouteContent({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>{children}</Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <TooltipProvider>
          <div className="app">
            <RouteContent>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/teacher-login" element={<TeacherLogin />} />
              <Route path="/student-login" element={<LoginSelection />} />
              <Route path="/class-login" element={<StudentClassLogin />} />
              {/* Legacy redirects for old login routes */}
              <Route
                path="/login"
                element={<Navigate to="/student-login" replace />}
              />
              <Route
                path="/teacher/login"
                element={<Navigate to="/teacher-login" replace />}
              />
              <Route
                path="/student/login"
                element={<Navigate to="/student-login" replace />}
              />
              <Route path="/signup" element={<SignupSelection />} />
              <Route path="/teacher/signup" element={<TeacherSignup />} />
              <Route path="/student/signup" element={<StudentSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* #872: parent/guardian completes a home-access invitation */}
              <Route
                path="/home-access/accept"
                element={<HomeAccessAccept />}
              />
              <Route path="/showcase" element={<ShowcaseMode isPublic />} />
              {/* Public zero-signup playable demo — the homepage growth
                  lever from docs/audits/k8-engagement-audit.md Part 3.
                  Must stay outside any auth-gated layout. */}
              <Route path="/try" element={<TryDemo />} />
              <Route path="/try/great-work" element={<GreatWorkDemo />} />
              {/* 都江堰水利工坊 · Waterworks — standalone showcase. Public, no
                  auth, deliberately linked from NOTHING (direct URL only);
                  device-local persistence, zero backend. Placement (#676)
                  decided later. See docs/games/waterworks-design.md. */}
              <Route path="/waterworks" element={<Waterworks />} />
              {/* Biome Buddy — reviewable prototype (docs/games/biome-buddy-design.md).
                  Public, no auth, linked from NOTHING; device-local persistence,
                  zero backend. /share renders a recipe carried in the URL
                  fragment; /review is the reviewer intro. Unlisted is not
                  authentication. */}
              <Route
                path="/biome-buddy"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <BiomeBuddy />
                  </Suspense>
                }
              />
              <Route
                path="/biome-buddy/share"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <BiomeBuddyShare />
                  </Suspense>
                }
              />
              <Route
                path="/biome-buddy/review"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <BiomeBuddyReview />
                  </Suspense>
                }
              />
              {import.meta.env.DEV && (
                <Route
                  path="/dev/echo-spike"
                  element={
                    <Suspense fallback={<LoadingScreen />}>
                      <EchoSpike />
                    </Suspense>
                  }
                />
              )}
              {import.meta.env.DEV && (
                <Route
                  path="/dev/advanced"
                  element={
                    <Suspense fallback={<LoadingScreen />}>
                      <AdvancedPreview />
                    </Suspense>
                  }
                />
              )}
              <Route path="/for-reviewers" element={<ForReviewers />} />
              <Route path="/for-teachers" element={<ForTeachers />} />
              <Route path="/for-families" element={<ForFamilies />} />
              {/* Free Access Plans detail pages — reached from the homepage
                  "Learn more" buttons. Public, persona-routed CTAs. */}
              <Route path="/plans/:plan" element={<PlanDetail />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/donate" element={<Donate />} />
              <Route
                path="/students"
                element={<AudiencePlaceholder audience="Students" />}
              />
              <Route path="/teachers" element={<TeachersRedirect />} />
              <Route path="/parents" element={<Parents />} />
              {/* Public print-friendly K-2 facilitator guide — linked from
                  /parents and Teacher Resources (single source, no copies). */}
              <Route path="/parents/guide" element={<ParentGuide />} />
              <Route
                path="/organizations"
                element={<AudiencePlaceholder audience="Organizations" />}
              />

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
                <Route
                  path="classes/:id/gallery"
                  element={<TeacherGallery />}
                />
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
                <Route path="classes" element={<StudentClasses />} />
                <Route
                  path="specialty"
                  element={
                    <Suspense fallback={<LoadingScreen />}>
                      <Specialty />
                    </Suspense>
                  }
                />
                <Route
                  path="advanced"
                  element={
                    <Suspense fallback={<LoadingScreen />}>
                      <Specialty />
                    </Suspense>
                  }
                />
                <Route path="avatar" element={<Avatar />} />
                <Route path="play" element={<PlayHub />} />
                <Route path="create-challenge" element={<CreateChallenge />} />
                <Route path="challenge/:id" element={<ChallengePlayer />} />
                <Route path="gallery" element={<StudentGallery />} />
                <Route path="settings" element={<StudentSettings />} />
                <Route
                  path="benchmark/:assignmentId"
                  element={<StudentBenchmark />}
                />
                <Route
                  path="arena"
                  element={<Navigate to="/student/play?tab=pvp" replace />}
                />
              </Route>

              {/* Admin: internal A/B testing dashboard — staff (admin role) only,
                  matching the backend staff capability (#873) */}
              <Route
                path="/admin/experiments"
                element={
                  <ProtectedRoute requiredRole="admin">
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
              <Route
                path="/pathways/welcome"
                element={
                  <ProtectedRoute>
                    <WelcomeAvatarStep />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pathways/welcome/skills"
                element={
                  <ProtectedRoute>
                    <WelcomeSkillsStep />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pathways/welcome/mission"
                element={
                  <ProtectedRoute>
                    <WelcomeMissionStep />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pathways/welcome/goals"
                element={
                  <ProtectedRoute>
                    <WelcomeGoalsStep />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pathways/welcome/complete"
                element={
                  <ProtectedRoute>
                    <WelcomeCompleteStep />
                  </ProtectedRoute>
                }
              />

              {/* Pathways: student authenticated routes */}
              <Route
                path="/pathways"
                element={
                  <ProtectedRoute>
                    <PathwaysLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<PathwaysHome />} />
                <Route path="tracks" element={<TracksOverview />} />
                <Route path="tracks/:trackSlug" element={<TrackDetail />} />
                <Route
                  path="tracks/:trackSlug/:moduleSlug"
                  element={<ModulePlayer />}
                />
                <Route path="challenges" element={<ChallengesPage />} />
                <Route path="challenges/:slug" element={<ChallengePage />} />
                <Route path="glossary" element={<GlossaryPage />} />
                <Route path="profile" element={<PathwaysProfile />} />
                {/* #874: join or confirm a cohort — the learner's own consent */}
                <Route path="join" element={<JoinCohort />} />
              </Route>

              {/* Pathways: facilitator routes — sibling of /pathways, owns its own
                  layout shell so the student sidebar doesn't render on top. */}
              <Route
                path="/pathways/facilitator"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <FacilitatorLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<FacilitatorDashboardPage />} />
                <Route path="cohorts" element={<CohortsListPage />} />
                <Route path="cohorts/new" element={<CohortNewPage />} />
                <Route path="cohorts/:id" element={<CohortDetailPage />} />
                <Route path="tracks" element={<FacilitatorTracksPage />} />
                <Route path="learners" element={<FacilitatorLearnersPage />} />
                <Route
                  path="learners/:userId"
                  element={<FacilitatorLearnerDetailPage />}
                />
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
            </RouteContent>
            <Toaster />

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
