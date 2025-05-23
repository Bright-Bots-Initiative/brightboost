
// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Import pages
import OrganizationLogin from './pages/TeacherLogin';
import OrganizationDashboard from './pages/TeacherDashboard';
// import StudentDashboard from './legacy/pages/StudentDashboard';
import OrganizationSignup from './pages/TeacherSignup';
// import StudentLogin from './legacy/pages/StudentLogin';
// import StudentSignup from './legacy/pages/StudentSignup';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import LoginSelection from './pages/LoginSelection';
import SignupSelection from './pages/SignupSelection';
import Index from './pages/Index';

// Import styles
import './App.css';

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
            <Route path="/organization/login" element={<OrganizationLogin />} />
            <Route path="/organization/signup" element={<OrganizationSignup />} />
            {/* Student routes moved to legacy
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/signup" element={<StudentSignup />} />
            */}
            
            {/* Protected routes */}
            <Route 
              path="/organization/dashboard" 
              element={
                <ProtectedRoute requiredRole="organization">
                  <OrganizationDashboard />
                </ProtectedRoute>
              } 
            />
            {/* Student dashboard route moved to legacy
            <Route 
              path="/student/dashboard" 
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            */}
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
