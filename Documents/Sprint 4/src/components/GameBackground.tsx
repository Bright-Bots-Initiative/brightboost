import React from 'react';

interface GameBackgroundProps {
  children: React.ReactNode;
}

const GameBackground: React.FC<GameBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brightboost-light via-blue-50 to-brightboost-light relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-brightboost-blue rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-brightboost-green rounded-full animate-bounce"></div>
        <div className="absolute bottom-20 left-20 w-12 h-12 bg-brightboost-yellow rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 right-40 w-14 h-14 bg-brightboost-blue rounded-full animate-bounce"></div>
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-12 gap-4 h-full">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="border border-brightboost-navy"></div>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
};

export default GameBackground;
