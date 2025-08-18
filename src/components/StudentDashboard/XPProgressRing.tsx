import { useEffect, useState } from "react";
import { join } from "../../services/api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

const XPProgressRing = () => {
  const [xp, setXp] = useState<number | null>(null);
  // const [percent, setPercent] = useState(0);
  const [levelUp, setLevelUp] = useState(false);

  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  const currentXp = xp ?? 0;
  const xpGoal = 100; // assume level-up at 100 for now
  const progress = Math.min(currentXp / xpGoal, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const [hasLeveledUp, setHasLeveledUp] = useState(false);

  useEffect(() => {
    // Mock fetch — replace with real API later
    const fetchXP = async () => {
      try {
        // to test out different xp values, use the following two rows and change the value in setXp
        //await new Promise(resolve => setTimeout(resolve, 200)); // simulate delay
        //setXp(50);
        const res = await fetch(join(API_BASE, "/user/xp"));
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setXp(data.currentXp);
      } catch {
        setXp(0); // fallback
      }
    };
    fetchXP();
  }, []);

  useEffect(() => {
    if (xp === null) return;

    // Handle level-up trigger
    if (xp >= 100 && !hasLeveledUp) {
      setLevelUp(true);
      setHasLeveledUp(true);
    } else if (xp < 100 && hasLeveledUp) {
      setHasLeveledUp(false);
    }
  }, [xp, hasLeveledUp]);

  useEffect(() => {
    if (levelUp) {
      const timeout = setTimeout(() => setLevelUp(false), 2900);
      return () => clearTimeout(timeout); // Always clean this up!
    }
  }, [levelUp]);

  return (
    <div className="relative w-24 h-24 text-brightboost-yellow">
      <svg height="100" width="100">
        <circle
          stroke="#e5e7eb" // background ring
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx="50"
          cy="50"
        />
        <circle
          className="stroke-current" // uses brightboost-yellow
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx="50"
          cy="50"
          style={{
            transition: "stroke-dashoffset 300ms ease-out",
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />
      </svg>

      {/* XP Text with brightboost-navy */}
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-brightboost-navy">
        {xp !== null ? `${currentXp} XP` : "0 XP"}
      </div>

      {levelUp && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-yellow-400 text-sm font-bold animate-bounce">
            🎉 Level Up!
          </div>
        </div>
      )}
    </div>
  );
};

export default XPProgressRing;
