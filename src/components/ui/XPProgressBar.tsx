import { motion, Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface XPProgressBarProps {
  currentXp: number;
  xpToNextLevel?: number;
  level: number;
}

const electricShockVariants: Variants = {
  normal: { x: 0, filter: "drop-shadow(0 0 0 transparent)" },
  shock: {
    x: [0, -4, 4, -4, 4, 0],
    filter: [
      "drop-shadow(0 0 0 transparent)",
      "drop-shadow(0 0 6px #00FFFF)",
      "drop-shadow(0 0 12px #00FFFF)",
      "drop-shadow(0 0 6px #00FFFF)",
      "drop-shadow(0 0 12px #00FFFF)",
      "drop-shadow(0 0 0 transparent)",
    ],
    transition: { duration: 0.8, ease: "easeInOut" },
  },
};

interface LightningBoltProps {
  filled: boolean;
}

const LightningBolt: React.FC<LightningBoltProps> = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill={filled ? "#1C3D6C" : "none"}
    stroke="#001F3F"
    strokeWidth="1"
    viewBox="0 0 24 24"
    width="16"
    height="16"
  >
    <path
      d="M13 2 L5 13 H11 L7 22 L19 9 H13 L17 2 Z"
      stroke="#001F3F"
      strokeWidth="1"
    />
  </svg>
);

const LightningParticles = ({
  trigger,
  batteryWidth = 200,
  boltCount = 12,
}: {
  trigger: boolean;
  batteryWidth?: number;
  boltCount?: number;
}) => {
  const [bolts, setBolts] = useState<
    { id: number; x: number; dx: number; dy: number; filled: boolean }[]
  >([]);

  useEffect(() => {
    if (trigger) {
      const newBolts = Array.from({ length: boltCount }, (_, i) => {
        const segmentWidth = batteryWidth / boltCount;
        const x = segmentWidth * (i + 0.5);
        const angle = Math.random() * Math.PI - Math.PI / 2;
        const distance = 60 + Math.random() * 30;

        return {
          id: i,
          x,
          dx: distance * Math.cos(angle),
          dy: distance * Math.sin(angle),
          filled: Math.random() > 0.5,
        };
      });

      setBolts(newBolts);

      const timer = setTimeout(() => setBolts([]), 800);
      return () => clearTimeout(timer);
    }
  }, [trigger, batteryWidth, boltCount]);

  return (
    <div
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: batteryWidth, height: 60 }}
    >
      {bolts.map(({ id, x, dx, dy, filled }) => (
        <motion.div
          key={id}
          className="absolute top-0"
          style={{ left: x }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: dx, y: dy, scale: 0.8 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <LightningBolt filled={filled} />
        </motion.div>
      ))}
    </div>
  );
};

const XPProgressBar: React.FC<XPProgressBarProps> = ({
  currentXp,
  xpToNextLevel = 200,
  level,
}) => {
  const segments = 10;
  const segmentValue = xpToNextLevel / segments;
  const filledSegments = Math.floor(currentXp / segmentValue);

  const prevLevelRef = useRef(level);
  const [isShocking, setIsShocking] = useState(false);
  const [shockId, setShockId] = useState(0);
  const [showLevelUpSlide, setShowLevelUpSlide] = useState(false);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setIsShocking(true);
      setShockId((id) => id + 1);
      setShowLevelUpSlide(true);

      const shockTimer = setTimeout(() => setIsShocking(false), 1200);
      const slideTimer = setTimeout(() => setShowLevelUpSlide(false), 1700);

      prevLevelRef.current = level;

      return () => {
        clearTimeout(shockTimer);
        clearTimeout(slideTimer);
      };
    } else {
      prevLevelRef.current = level;
    }
  }, [level]);

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Level and XP label */}
      <div className="flex items-center gap-2 text-sm text-brightboost-navy font-semibold mb-1">
        <span>Level {level}</span>
        <span className="mx-6" />
        <span className="w-[100px] inline-block text-right">
          {currentXp}/{xpToNextLevel} XP
        </span>
      </div>

      <motion.div
        className="relative flex items-center gap-0"
        variants={electricShockVariants}
        animate={isShocking ? "shock" : "normal"}
      >
        {/* Lightning bolts */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <LightningParticles
            key={shockId}
            trigger={isShocking}
            batteryWidth={236}
            boltCount={6}
          />
        </div>

        {/* Level up popup */}
        {showLevelUpSlide && (
          <div
            className="absolute rounded-l-md pointer-events-none z-20"
            style={{
              top: 2,
              left: 2,
              width: 204,
              height: 36,
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="h-full bg-white flex items-center justify-center rounded-l-md"
              style={{ borderRadius: "0.375rem 0 0 0.375rem" }}
            >
              <span className="text-brightboost-navy font-bold text-sm">
                Level Up!
              </span>
            </motion.div>
          </div>
        )}

        {/* XP bar segments */}
        <div className="flex h-10 gap-1 border-2 border-brightboost-blue rounded-l-md bg-white px-1 py-0.5 relative z-10">
          {[...Array(segments)].map((_, i) => {
            const isFilled = i < filledSegments;
            return (
              <motion.div
                key={`${level}-${i}`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className={`w-4 h-full rounded-sm ${
                  isFilled ? "bg-brightboost-blue" : "bg-brightboost-lightblue"
                }`}
              />
            );
          })}
        </div>

        {/* Battery cap */}
        <div className="w-2 h-[70%] border-2 border-l-0 border-brightboost-blue bg-white rounded-r-sm relative z-10" />
      </motion.div>
    </div>
  );
};

export default XPProgressBar;
