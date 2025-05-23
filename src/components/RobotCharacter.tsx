
import React from 'react';

export type RobotType = 'teacher' | 'helper' | 'friend';

interface RobotCharacterProps {
  type: RobotType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RobotCharacter: React.FC<RobotCharacterProps> = ({ 
  type, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  };
  
  const robotColors = {
    teacher: {
      primary: '#46B1E6', // brightboost-blue
      secondary: '#1C3D6C', // brightboost-navy
      accent: '#FFC107' // amber
    },
    helper: {
      primary: '#8BD2ED', // brightboost-lightblue
      secondary: '#46B1E6', // brightboost-blue
      accent: '#FF9C81' // brightboost-coral
    },
    friend: {
      primary: '#FF9C81', // brightboost-coral
      secondary: '#8BD2ED', // brightboost-lightblue
      accent: '#46B1E6' // brightboost-blue
    }
  };
  
  const colors = robotColors[type];
  
  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Robot head */}
      <div 
        style={{backgroundColor: colors.primary}}
        className="absolute inset-0 rounded-xl overflow-hidden border-2 border-white"
      >
        {/* Robot eyes */}
        <div className="absolute top-1/4 left-1/4 w-2/5 h-1/5 bg-white rounded-full">
          <div 
            style={{backgroundColor: colors.secondary}}
            className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full"
          ></div>
        </div>
        <div className="absolute top-1/4 right-1/4 w-2/5 h-1/5 bg-white rounded-full">
          <div 
            style={{backgroundColor: colors.secondary}}
            className="absolute top-1/4 right-1/4 w-1/2 h-1/2 rounded-full"
          ></div>
        </div>
        
        {/* Robot mouth */}
        <div 
          style={{backgroundColor: colors.accent}}
          className="absolute bottom-1/4 left-1/4 w-1/2 h-1/6 rounded-full"
        ></div>
        
        {/* Robot antenna */}
        <div 
          style={{backgroundColor: colors.secondary}}
          className="absolute -top-1/6 left-1/2 transform -translate-x-1/2 w-1/6 h-1/6 rounded-full"
        ></div>
      </div>
    </div>
  );
};

export default RobotCharacter;
