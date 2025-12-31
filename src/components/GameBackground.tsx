import React from "react";
import Cloud from "./Cloud";

interface GameBackgroundProps {
  children: React.ReactNode;
}

const GameBackground: React.FC<GameBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brightboost-lightblue to-white overflow-hidden relative font-montserrat">
      {/* Sun + Glow Accent */}
      <div className="sun-glow" />

      {/* Cloud Layer 1 (Foreground, LTR) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="cloud-layer-1 absolute top-20 left-0">
          <div className="cloud-bob-effect">
            <Cloud className="w-32 h-16 opacity-80" />
          </div>
        </div>
        <div
          className="cloud-layer-1 absolute top-1/4 left-1/2"
          style={{ animationDelay: "-60s" }}
        >
          <div className="cloud-bob-effect" style={{ animationDelay: "-5s" }}>
            <Cloud className="w-24 h-12 opacity-70" />
          </div>
        </div>
      </div>

      {/* Cloud Layer 2 (Mid, RTL) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="cloud-layer-2 absolute top-10 right-0">
          <Cloud className="w-28 h-14 opacity-60" />
        </div>
        <div
          className="cloud-layer-2 absolute top-1/3 right-1/4"
          style={{ animationDelay: "-80s" }}
        >
          <Cloud className="w-20 h-10 opacity-50" />
        </div>
      </div>

      {/* Cloud Layer 3 (Back, LTR, Slowest) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="cloud-layer-3 absolute top-5 left-1/4"
          style={{ animationDelay: "-20s" }}
        >
          <Cloud className="w-16 h-8 opacity-40" />
        </div>
        <div
          className="cloud-layer-3 absolute top-40 left-3/4"
          style={{ animationDelay: "-100s" }}
        >
          <Cloud className="w-24 h-12 opacity-30" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default GameBackground;
