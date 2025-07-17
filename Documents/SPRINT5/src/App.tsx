import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import TeacherLayout from './components/TeacherDashboard/TeacherLayout';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherClasses from './pages/TeacherClasses';
import TeacherClassDetail from './pages/TeacherClassDetail';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/teacher/dashboard" replace />}
          />
          <Route
            path="/teacher/*"
            element={
              <TeacherLayout>
                <Routes>
                  <Route path="dashboard" element={<TeacherDashboard />} />
                  <Route path="classes" element={<TeacherClasses />} />
                  <Route path="classes/:id" element={<TeacherClassDetail />} />
                  <Route
                    path="students"
                    element={
                      <div className="p-6">
                        <h2 className="text-2xl font-bold text-brightboost-navy">
                          Students
                        </h2>
                        <p className="text-gray-600">
                          Students page coming soon...
                        </p>
                      </div>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <div className="p-6">
                        <h2 className="text-2xl font-bold text-brightboost-navy">
                          Settings
                        </h2>
                        <p className="text-gray-600">
                          Settings page coming soon...
                        </p>
                      </div>
                    }
                  />
                </Routes>
              </TeacherLayout>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
