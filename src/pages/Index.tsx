// src/pages/Index.tsx
import React from "react";
import { Link } from "react-router-dom";
import GameBackground from "../components/GameBackground";

const Index: React.FC = () => {
  return (
    <GameBackground>
      <div className="flex flex-col min-h-screen p-4 relative z-10">
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-7xl font-extrabold text-brightboost-navy mb-3 drop-shadow-sm tracking-tight">
              Bright Boost
            </h1>
            <p className="text-xl md:text-2xl text-brightboost-navy font-semibold">
              Learn. Play. Explore!
            </p>
            <p className="text-base md:text-lg text-brightboost-navy/70 mt-1">
              Games and adventures that make you smarter
            </p>
          </div>

          <div className="space-y-4 flex flex-col items-center">
            <Link
              to="/login"
              className="button-shadow rounded-xl px-8 py-4 bg-brightboost-blue text-white font-bold text-center text-lg hover:bg-opacity-90 hover:scale-105 transition-all w-64 ui-lift"
            >
              Let's Go!
            </Link>
            <Link
              to="/class-login"
              className="button-shadow rounded-xl px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-center text-lg hover:scale-105 transition-all w-64 ui-lift"
            >
              I'm a Student! 🎒
            </Link>
            <Link
              to="/signup"
              className="button-shadow rounded-xl px-6 py-3 bg-brightboost-lightblue text-brightboost-navy font-bold text-center hover:bg-opacity-90 hover:scale-105 transition-all w-56 ui-lift"
            >
              I'm New Here
            </Link>
          </div>
        </div>

        <footer className="text-center py-4 text-sm text-brightboost-navy/70">
          <Link to="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <span className="mx-2">|</span>
          <Link to="/terms" className="hover:underline">
            Terms of Service
          </Link>
        </footer>
      </div>
    </GameBackground>
  );
};

export default Index;
