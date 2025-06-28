import React, { useState } from 'react';
import {
  ShieldCheck,
  Lightbulb,
  Lock,
  Power,
  Hammer,
  Network,
  Rocket,
} from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  awardedAt: string;
}

interface BadgeSlotProps {
  badge?: Badge;
}

const badgeIconMap: Record<string, JSX.Element> = {
  1: <Lightbulb className="w-6 h-6 text-yellow-500" />,
  2: <ShieldCheck className="w-6 h-6 text-blue-500" />,
  3: <Power className="w-6 h-6 text-green-500" />,
  4: <Hammer className="w-6 h-6 text-red-500" />,
  5: <Network className="w-6 h-6 text-indigo-500" />,
  6: <Rocket className="w-6 h-6 text-pink-500" />,
};

const getBadgeIcon = (id: string): JSX.Element => {
  return badgeIconMap[id] ?? <Lock className="text-gray-400 w-6 h-6" />;
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const BadgeSlot: React.FC<BadgeSlotProps> = ({ badge }) => {
  const [flipped, setFlipped] = useState(false);
  const isUnlocked = badge && isValidDate(badge.awardedAt);

  const octagonClipPath =
    'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

  return (
    <div className="relative flex flex-col items-center w-32">
      {/* Flip container */}
      <div
        className="w-24 h-24 relative cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => badge && setFlipped(!flipped)}
      >
        {/* Outer octagon border */}
        <div
          className="absolute inset-0 z-0"
          style={{
            clipPath: octagonClipPath,
            background: 'linear-gradient(to bottom right, #1C3D6C, #46B1E6)',
          }}
        />

        {/* Inner flippable card */}
        <div
          className={`absolute inset-[4px] transition-transform duration-700`}
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front face */}
          <div
            className="absolute w-full h-full flex items-center justify-center"
            style={{
              clipPath: octagonClipPath,
              backfaceVisibility: 'hidden',
              backgroundColor: '#ffffff',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><g stroke='%23d4f0ff' stroke-width='1'><path d='M0 0 L100 100 M100 0 L0 100 M50 0 L50 100 M0 50 L100 50' /></g></svg>")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '40px 40px',
            }}
          >
            {isUnlocked ? getBadgeIcon(badge.id) : <Lock className="text-gray-400 w-6 h-6" />}
          </div>

          {/* Back face */}
          <div
            className="absolute w-full h-full flex items-center justify-center text-xs text-center px-2"
            style={{
              clipPath: octagonClipPath,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              backgroundColor: '#ffffff',
              color: '#001F54',
            }}
          >
            {isUnlocked ? badge.awardedAt : 'Unlock by completing tasks!'}
          </div>
        </div>
      </div>

      {/* Badge Label */}
      <div className="absolute bottom-[-8px] z-20 flex items-center">
        {/* Left trapezoid */}
        <div
          className="w-4 h-6 z-10 -mr-2.5"
          style={{
            backgroundColor: '#FF9C81',
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 25% 100%)',
            transform: 'translateY(3px)',
          }}
        />
        {/* Label */}
        <div
          className="z-20 px-2 py-1 text-xs font-bold text-brightboost-navy uppercase text-center shadow-md"
          style={{
            backgroundColor: '#FF9C81',
            clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)',
          }}
        >
          {badge ? badge.name : 'Locked'}
        </div>
        {/* Right trapezoid */}
        <div
          className="w-4 h-6 z-10 -ml-2.5"
          style={{
            backgroundColor: '#FF9C81',
            clipPath: 'polygon(0% 0%, 100% 0%, 75% 100%, 0% 100%)',
            transform: 'translateY(3px)',
          }}
        />
      </div>
    </div>
  );
};

export default BadgeSlot;