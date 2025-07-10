import React, { useEffect, useState, useRef } from 'react';
import { Flame, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreakMeterProps {
  currentStreak: number;
  longestStreak: number;
  onNewRecord?: (bonus: number) => void;
  currentStreakDays?: boolean[];
  barColor?: string;
}

const StreakMeter: React.FC<StreakMeterProps> = ({
  currentStreak,
  longestStreak,
  onNewRecord,
  currentStreakDays = [false, false, false, false, false, false, false],
  barColor,
}) => {
  const [hasBrokenRecord, setHasBrokenRecord] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hovering, setHovering] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (currentStreak > longestStreak && !hasBrokenRecord) {
      onNewRecord?.(50);
      setShowCelebration(true);
      setHasBrokenRecord(true);
    }
  }, [currentStreak, longestStreak, onNewRecord, hasBrokenRecord]);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const progress = longestStreak > 0 ? Math.min(currentStreak / longestStreak, 1) : 0;

  const minLeftPx = 4; // distance from left edge
  const maxLeftPx = containerWidth - 8; // distance from right edge

  const desiredLeftPx = progress * containerWidth;
  const clampedLeftPx = Math.min(Math.max(desiredLeftPx, minLeftPx), maxLeftPx);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayIndex = new Date().getUTCDay();

  // Show tooltip always if running Cypress tests (for easier testing)
  const showTooltip = hovering || (window as any).Cypress;

  return (
    <>
      {/* Hoverable streak bar */}
      <div
        ref={containerRef}
        className="relative w-full max-w-md cursor-pointer"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        data-cy="streak-meter"
      >
        {/* Flame slider icon with smooth left transition */}
        <div
          className="absolute z-10"
          style={{
            left: clampedLeftPx,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'left 300ms ease-in-out',
          }}
          data-cy="flame-icon"
        >
          <Flame className="w-9 h-9 text-red-500 fill-orange-300 drop-shadow-md" />
        </div>

        {/* Streak bar body */}
        <div
          className="relative h-[24px] rounded-full"
          style={{
            background: barColor || '#FF8C00',
            padding: '3px',
          }}
          data-cy="streak-bar"
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: '#8BD2ED',
              padding: '2px',
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-in-out"
              style={{
                width: `${progress * 100}%`,
                background: barColor || '#FF8C00',
              }}
              data-cy="streak-progress"
            />
          </div>
        </div>

        {/* Hover window / Tooltip */}
        {showTooltip && (
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-4 bg-white text-sm text-gray-800 rounded-xl shadow-lg z-20 w-60"
            data-cy="streak-tooltip"
          >
            {/* Message */}
            <div className="text-center font-medium mb-2" data-cy="streak-status">
              {currentStreak === 0 ? (
                  <span>No streak yet - start today!</span>
              ) : (
                  <span>
                  Keep it up, your current streak is <strong>{currentStreak}</strong>!
                  </span>
              )}

              {/* Hidden numeric streak for tests */}
              <span
                data-cy="current-streak"
                style={{ display: 'none' }}
              >
                {currentStreak}
              </span>
            </div>

            {/* Weekly Streak */}
            <div className="text-center font-medium mb-2">Weekly Streak</div>
            <div className="grid grid-cols-7 gap-3 ml-[-6px]">
              {dayLabels.map((day, index) => {
                const isToday = index === todayIndex;
                const isActive = currentStreakDays[index];

                const style: React.CSSProperties = {};
                if (isActive) style.backgroundColor = barColor || '#FF8C00';
                if (isToday) style.borderColor = barColor || '#FF8C00';

                return (
                  <div
                    key={index}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${isToday ? 'border-2' : ''}
                      ${isActive ? 'text-white' : 'bg-gray-200 text-gray-700'}`}
                    style={style}
                    data-cy={`streak-day-${index}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Record Info */}
            <div className="mt-3 text-center text-xs text-gray-500" data-cy="streak-record">
              Record: {longestStreak} day{longestStreak !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white text-center p-6 rounded-xl shadow-lg"
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              data-cy="celebration-modal"
            >
              <PartyPopper className="w-10 h-10 mx-auto text-yellow-500" />
              <h2 className="text-xl font-bold mt-2 text-brightboost-navy">New Streak Record!</h2>
              <p className="text-sm mt-1 text-gray-600">+50 XP</p>
              <button
                onClick={() => setShowCelebration(false)}
                className="mt-4 px-4 py-2 rounded bg-brightboost-blue text-white hover:bg-brightboost-blue/90"
                data-cy="celebration-close-button"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StreakMeter;
