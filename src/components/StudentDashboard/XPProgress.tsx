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

  const displayLevel = hasLeveledUp ? level + 1 : level;

  return (
    <div className="flex items-center w-full">
      {/* Popup */}
      {showPopup && (
        <div
          className="absolute top-0 right-0 bg-brightboost-green text-white px-4 py-2 rounded-xl shadow-lg z-50"
          role="status"
          aria-live="polite"
        >
          🎉 Leveled Up!
        </div>
      )}

      <div className="bg-brightboost-yellow px-4 py-1 rounded-full flex items-center gap-3 shadow text-sm font-medium flex-grow min-w-0">
        {/* Level - Made accessible by removing aria-hidden */}
        <div className="flex items-center gap-1">
          <span className="text-base font-bold text-brightboost-navy">
            XP: Level
          </span>
          <span className="text-base font-bold text-brightboost-navy">
            {displayLevel}
          </span>
        </div>

        {/* XP bar */}
        <div
          className="relative h-3 bg-white rounded-full overflow-hidden flex-grow min-w-0"
          role="progressbar"
          aria-valuenow={Math.round(xp)}
          aria-valuemin={0}
          aria-valuemax={Math.round(xpToNext)}
          aria-label={`XP Progress: Level ${displayLevel}`}
        >
          <div
            className="absolute top-0 left-0 h-full bg-brightboost-blue transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* XP count - hidden from SR as bar provides value, but good for visual */}
        <span className="text-xs text-brightboost-navy" aria-hidden="true">
          {Math.round(xp)}/{Math.round(xpToNext)}
        </span>
      </div>
    </div>
  );
};

export default XPProgressWidget;
