
import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface UserSelectionButtonProps {
  text: string;
  to: string;
  bgColor?: string;
  icon?: React.ReactNode;
}

const UserSelectionButton: React.FC<UserSelectionButtonProps> = ({ 
  text, 
  to, 
  bgColor = "bg-brightbots-purple",
  icon
}) => {
  return (
    <Link 
      to={to}
      className={cn(
        "button-shadow rounded-2xl px-8 py-6 text-white font-bold text-2xl md:text-3xl",
        "flex items-center justify-center gap-4 transition-all hover:scale-105",
        "min-w-[280px] w-full max-w-sm",
        bgColor
      )}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
};

export default UserSelectionButton;
