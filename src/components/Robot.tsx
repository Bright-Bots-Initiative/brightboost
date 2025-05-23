
import React from 'react';
import { cn } from '@/lib/utils';

interface RobotProps {
  className?: string;
}

const Robot: React.FC<RobotProps> = ({ className }) => {
  return (
    <div className={cn("animate-float", className)}>
      <div className="relative">
        <div className="w-40 h-40 bg-brightbots-blue rounded-2xl flex items-center justify-center relative">
          {/* Robot eyes */}
          <div className="absolute top-6 left-6 w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full"></div>
          </div>
          <div className="absolute top-6 right-6 w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full"></div>
          </div>
          
          {/* Robot mouth */}
          <div className="absolute bottom-8 w-16 h-6 bg-white rounded-lg"></div>
          
          {/* Robot antenna */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="w-4 h-8 bg-brightbots-purple"></div>
            <div className="w-8 h-8 bg-brightbots-pink rounded-full -mt-4 mx-auto"></div>
          </div>
        </div>
        
        {/* Robot arms */}
        <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-8 h-20 bg-brightbots-yellow rounded-lg"></div>
        <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 w-8 h-20 bg-brightbots-yellow rounded-lg"></div>
      </div>
    </div>
  );
};

export default Robot;
