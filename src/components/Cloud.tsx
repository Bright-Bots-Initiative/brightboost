import React from "react";
import { cn } from "@/lib/utils";

interface CloudProps {
  className?: string;
  style?: React.CSSProperties;
}

const Cloud: React.FC<CloudProps> = ({ className, style }) => {
  return (
    <div className={cn("absolute cloud", className)} style={style}>
      <svg
        width="180"
        height="100"
        viewBox="0 0 180 100"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M165 60C165 79.33 149.33 95 130 95H50C30.67 95 15 79.33 15 60C15 40.67 30.67 25 50 25C52.04 25 54.04 25.16 56 25.46C63.48 10.28 79.46 0 98 0C121.2 0 140.24 17.16 143.56 39.8C156.24 41.64 165 49.92 165 60Z"
          fill="white"
        />
      </svg>
    </div>
  );
};

export default Cloud;
