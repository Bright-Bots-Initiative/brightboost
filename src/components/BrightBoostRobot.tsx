import React from 'react';
import { Bot } from 'lucide-react';

interface BrightBoostRobotProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BrightBoostRobot: React.FC<BrightBoostRobotProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-brightboost-blue flex items-center justify-center animate-pulse`}>
        <Bot className="w-3/4 h-3/4 text-white" />
      </div>
    </div>
  );
};

export default BrightBoostRobot;