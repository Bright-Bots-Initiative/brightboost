import React from "react";

interface GameBackgroundProps {
  children: React.ReactNode;
}

const GameBackground: React.FC<GameBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brightboost-lightblue to-white overflow-hidden relative font-montserrat">
      {/* Add some clouds in the background */}
      {/* Cloud 1 - Fast, starts somewhat in view */}
      <div
        className="absolute top-10 left-0 w-20 h-10 bg-white rounded-full opacity-70 animate-cloud-drift"
        style={{ animationDuration: '60s', animationDelay: '-10s' }}
      ></div>

      {/* Cloud 2 - Medium, starts further along (effectively right side) */}
      <div
        className="absolute top-20 left-0 w-32 h-16 bg-white rounded-full opacity-70 animate-cloud-drift"
        style={{ animationDuration: '90s', animationDelay: '-60s' }}
      ></div>

      {/* Cloud 3 - Slow, starts middle */}
      <div
        className="absolute top-5 left-0 w-24 h-12 bg-white rounded-full opacity-70 animate-cloud-drift"
        style={{ animationDuration: '120s', animationDelay: '-40s' }}
      ></div>

      {children}
    </div>
  );
};

export default GameBackground;
