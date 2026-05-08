import React, { useState } from "react";
import FloatingBadge from "./FloatingBadge";

const MASCOT_SRC = "/mascots/bright-bot-character.png";

const MascotHeroVisual: React.FC = () => {
  const [mascotLoaded, setMascotLoaded] = useState(true);

  return (
    <div className="relative flex items-center justify-center h-[250px] md:h-[320px] w-full">
      <div
        aria-hidden="true"
        className="absolute z-0 rounded-full w-[260px] h-[260px] md:w-[360px] md:h-[360px]"
        style={{ background: "radial-gradient(circle, rgba(250,204,21,0.35) 0%, rgba(250,204,21,0.08) 45%, rgba(250,204,21,0) 70%)" }}
      />

      <div className="relative z-10 mascot-bob">
        {mascotLoaded ? (
          <div className="mascot-flip">
            <img
              src={MASCOT_SRC}
              alt="Bright Boost mascot"
              className="w-[180px] md:w-[250px] block"
              onError={() => setMascotLoaded(false)}
            />
          </div>
        ) : (
          <div
            role="img"
            aria-label="Bright Boost mascot placeholder"
            className="w-[180px] h-[180px] md:w-[250px] md:h-[250px] rounded-full bg-white/85 border-2 border-[#46B1E6]/30 flex items-center justify-center text-6xl md:text-7xl shadow-md"
          >
            🤖
          </div>
        )}
      </div>


      <FloatingBadge
        label="Always Free"
        accent="#69D681"
        className="-top-1 left-1/2 -translate-x-[150px] -rotate-[5deg] md:-translate-x-[175px]"
      />
      <FloatingBadge
        label="Interactive Games"
        accent="#46B1E6"
        className="top-4 right-3 rotate-[4deg] hidden md:block"
      />
      <FloatingBadge
        label="Track Progress"
        accent="#7C6EE6"
        className="bottom-5 left-4 -rotate-[3deg] hidden md:block"
      />
      <FloatingBadge
        label="Bilingual"
        accent="#8BD2ED"
        className="bottom-2 right-8 rotate-[5deg]"
      />
    </div>
  );
};

export default MascotHeroVisual;
