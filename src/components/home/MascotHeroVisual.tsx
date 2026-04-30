import React from "react";
import FloatingBadge from "./FloatingBadge";

const MascotHeroVisual: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center h-[250px] md:h-[320px] w-full">
      <div
        aria-hidden="true"
        className="absolute z-0 rounded-full w-[260px] h-[260px] md:w-[360px] md:h-[360px]"
        style={{ background: "radial-gradient(circle, rgba(250,204,21,0.35) 0%, rgba(250,204,21,0.08) 45%, rgba(250,204,21,0) 70%)" }}
      />

      <div className="relative z-10 mascot-bob">
        <img
          src="/robots/robot_explorer.png"
          alt="Bright Boost mascot"
          className="w-[180px] md:w-[250px]"
          style={{ transform: "scaleX(-1)" }}
        />
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
