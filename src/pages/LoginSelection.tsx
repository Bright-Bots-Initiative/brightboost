
import React from 'react';
import { Link } from 'react-router-dom';
import GameBackground from '../components/GameBackground';

const LoginSelection: React.FC = () => {
  return (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-brightboost-navy mb-2">
            Choose Login Type
          </h1>
          <p className="text-lg text-brightboost-navy">
            Select how you'd like to login
          </p>
        </div>
        
        <div className="game-card p-8 w-full max-w-md">
          <div className="grid grid-cols-1 gap-4">
            <Link
              to="/teacher/login"
              className="button-shadow rounded-xl px-6 py-4 bg-brightboost-navy text-white font-bold text-center hover:bg-opacity-90 transition-all"
            >
              Teacher Login
            </Link>
            <Link
              to="/student/login"
              className="button-shadow rounded-xl px-6 py-4 bg-brightboost-lightblue text-brightboost-navy font-bold text-center hover:bg-opacity-90 transition-all"
            >
              Student Login
            </Link>
          </div>
          
          <div className="mt-6 text-center">
            <Link to="/" className="text-brightboost-blue font-bold hover:underline transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default LoginSelection;
