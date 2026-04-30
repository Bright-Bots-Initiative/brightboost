import React from "react";

type FloatingBadgeProps = {
  label: string;
  accent: string;
  className?: string;
};

const FloatingBadge: React.FC<FloatingBadgeProps> = ({ label, accent, className = "" }) => {
  return (
    <div
      className={`absolute rounded-[12px] border-2 bg-white px-3 py-1.5 text-xs md:text-sm font-bold text-brightboost-navy shadow-md ${className}`}
      style={{ borderColor: accent }}
    >
      {label}
    </div>
  );
};

export default FloatingBadge;
