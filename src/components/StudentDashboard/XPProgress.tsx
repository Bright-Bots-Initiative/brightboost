import { useEffect, useState } from "react";

interface XPProgressWidgetProps {
  currentXp: number;
  nextLevelXp: number;
  level: number;
}

const XPProgressWidget = ({
  currentXp,
  nextLevelXp,
  level,
}: XPProgressWidgetProps) => {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (currentXp >= nextLevelXp) {
      setShowPopup(true);
      const timeout = setTimeout(() => setShowPopup(false), 3000); // hides after 3s
      return () => clearTimeout(timeout);
    }
  }, [currentXp, nextLevelXp]);

  const hasLeveledUp = currentXp >= nextLevelXp;
  const xp = hasLeveledUp ? currentXp - nextLevelXp : currentXp;
  const xpToNext = hasLeveledUp ? nextLevelXp * 1.5 : nextLevelXp; // Optional logic: scale difficulty
  const percentage = Math.min(100, (xp / xpToNext) * 100);

  return (
    <div className="flex items-center justify-end w-full">
      {/* Popup */}
      {showPopup && (
        <div className="absolute top-0 right-0 bg-brightboost-green text-white px-4 py-2 rounded-xl shadow-lg z-50">
          🎉 Leveled Up!
        </div>
      )}

      <div className="bg-brightboost-yellow px-4 py-1 rounded-full flex items-center gap-3 shadow text-sm font-medium">
        {/* Level */}
        <div className="flex items-center gap-1">
          <span className="text-base font-bold text-brightboost-navy">
            XP: Level
          </span>
          <span className="text-base font-bold text-brightboost-navy">
            {hasLeveledUp ? level + 1 : level}
          </span>
        </div>

        {/* XP bar */}
        <div className="relative w-32 h-3 bg-white rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-brightboost-blue transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* XP count */}
        <span className="text-xs text-brightboost-navy">
          {xp}/{xpToNext}
        </span>
      </div>
    </div>
  );
};

export default XPProgressWidget;
