// src/pages/Index.tsx
import React from "react";
import { Link } from "react-router-dom";
import GameBackground from "../components/GameBackground";

const Index: React.FC = () => {
  return (
    <GameBackground>
      <div className="flex flex-col min-h-screen p-4 relative z-10">
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-brightboost-navy mb-2 drop-shadow-sm">
              Bright Boost
            </h1>
            <p className="text-lg md:text-xl text-brightboost-navy">
              Empowering young minds with technology skills
            </p>
          </div>

          <div className="space-y-4 flex flex-col items-center">
            <Link
              to="/login"
              className="button-shadow rounded-xl px-8 py-4 bg-brightboost-blue text-white font-bold text-center hover:bg-opacity-90 transition-all w-64 ui-lift"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="button-shadow rounded-xl px-6 py-3 bg-brightboost-lightblue text-brightboost-navy font-bold text-center hover:bg-opacity-90 transition-all w-56 ui-lift"
            >
              Signup
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
