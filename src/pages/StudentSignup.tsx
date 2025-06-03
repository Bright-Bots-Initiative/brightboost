
// src/pages/StudentSignup.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import GameBackground from '../components/GameBackground';
import BrightBoostRobot from '../components/BrightBoostRobot';

const StudentSignup: React.FC = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      login();
    } catch (err: unknown) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
              <p className="text-sm">Authentication is now handled through GitHub OAuth. Click Sign Up to continue with your GitHub account.</p>
            </div>
            <BrightBoostRobot className="hidden md:block" />
          </div>
          
          <div className="game-card p-6 flex-1 w-full max-w-md">
            <BrightBoostRobot className="md:hidden mx-auto mb-6" size="sm" />
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`button-shadow w-full py-3 px-4 rounded-xl text-brightboost-navy font-bold ${
                  isLoading ? 'bg-brightboost-yellow/70' : 'bg-brightboost-yellow'
                } transition-colors`}
              >
                {isLoading ? 'Redirecting...' : 'Sign Up with GitHub'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-brightboost-navy">
                Already have an account?{' '}
                <Link to="/student/login" className="text-brightboost-blue font-bold hover:underline transition-colors">
                  Log in
                </Link>
              </p>
              <p className="text-sm text-brightboost-navy mt-2">
                <Link to="/" className="text-brightboost-blue font-bold hover:underline transition-colors">
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
