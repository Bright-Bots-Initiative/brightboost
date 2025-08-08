import React from "react";

interface GameBackgroundProps {
  children: React.ReactNode;
}

const GameBackground: React.FC<GameBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brightboost-lightblue to-white overflow-hidden relative font-montserrat">
      {/* Add some clouds in the background */}
      <div className="absolute top-10 left-10 w-20 h-10 bg-white rounded-full opacity-70"></div>
      <div className="absolute top-20 left-40 w-32 h-16 bg-white rounded-full opacity-70"></div>
      <div className="absolute top-5 right-20 w-24 h-12 bg-white rounded-full opacity-70"></div>
      {children}
    </div>
  );
};

export default GameBackground;
