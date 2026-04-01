import React from "react";
import { Rocket } from "lucide-react";

interface RobotProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const sizeMap = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };

const BrightBoostRobot: React.FC<RobotProps> = ({
  size = "md",
  className = "",
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Rocket className={`${sizeMap[size]} text-brightboost-blue`} />
    </div>
  );
};

export default BrightBoostRobot;
