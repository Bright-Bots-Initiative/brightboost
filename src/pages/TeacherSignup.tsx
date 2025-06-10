
// src/pages/TeacherSignup.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signupTeacher, loginUser } from '../services/api';
import GameBackground from '../components/GameBackground';
import BrightBoostRobot from '../components/BrightBoostRobot';

const TeacherSignup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('Attempting to sign up teacher:', { name, email });
      const response = await signupTeacher(name, email, password);
      console.log('TeacherSignup: Signup successful, response:', response);
      
      if (response.token && response.user) {
        console.log('TeacherSignup: Using signup response token and user directly');
        login(response.token, response.user);
      } else {
        console.log('TeacherSignup: No token in signup response, attempting login...');
        // Fallback: Automatically log in the user after successful signup
        const loginResponse = await loginUser(email, password);
        console.log('TeacherSignup: Login response:', loginResponse);
        login(loginResponse.token, loginResponse.user);
      }
    } catch (err: unknown) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign up. Please try again.');
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
              Join as a Teacher
            </h1>
            <p className="text-lg text-brightboost-navy mb-6">
              Share your knowledge and inspire the next generation
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
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-brightboost-navy mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-brightboost-navy mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-brightboost-navy mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all"
                  placeholder="Create a password"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-brightboost-navy mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white border-2 border-brightboost-lightblue text-brightboost-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className={`button-shadow w-full py-3 px-4 rounded-xl text-white font-bold ${
                  isLoading ? 'bg-brightboost-blue/70' : 'bg-brightboost-blue'
                } transition-colors`}
              >
                {isLoading ? 'Signing up...' : 'Sign Up'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-brightboost-navy">
                Already have an account?{' '}
                <Link to="/teacher/login" className="text-brightboost-blue font-bold hover:underline transition-colors">
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

export default TeacherSignup;
