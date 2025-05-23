
import React from 'react';
import { Link } from 'react-router-dom';
import GameBackground from '../components/GameBackground';

const Home: React.FC = () => {
  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-brightboost-navy mb-6">
            Welcome to Bright Boost
          </h1>
          <p className="text-lg text-brightboost-navy mb-8">
            An interactive learning platform for students and teachers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/login" 
              className="game-button bg-brightboost-blue hover:bg-brightboost-navy px-8 py-3 rounded-xl text-white font-bold text-lg shadow-lg transition-all"
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="game-button bg-brightboost-lightblue hover:bg-brightboost-blue px-6 py-2.5 rounded-xl text-white font-bold text-base shadow-md transition-all"
            >
              Signup
            </Link>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default Home;
