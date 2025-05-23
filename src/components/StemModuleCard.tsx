
import React from 'react';
import { Link } from 'react-router-dom';

interface ActivityProps {
  title: string;
  icon: string;
  color: string;
  path: string;
}

interface StemModuleCardProps {
  title: string;
  subtitle: string;
  activities: ActivityProps[];
  robotImage?: string;
}

const StemModuleCard: React.FC<StemModuleCardProps> = ({ 
  title, 
  subtitle, 
  activities,
  robotImage
}) => {
  return (
    <div className="game-card overflow-hidden">
      <div className="bg-brightboost-lightblue text-brightboost-navy p-4 rounded-t-xl">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm">{subtitle}</p>
      </div>
      
      <div className="p-4 bg-white rounded-b-xl">
        <div className="grid grid-cols-2 gap-3">
          {activities.map((activity, index) => (
            <Link 
              key={index}
              to={activity.path}
              className={`p-4 rounded-xl shadow-md transition-transform hover:scale-105 ${activity.color} flex flex-col items-center text-center`}
            >
              <img src={activity.icon} alt={activity.title} className="w-12 h-12 mb-2" />
              <span className="font-medium text-sm">{activity.title}</span>
            </Link>
          ))}
        </div>
        
        {robotImage && (
          <div className="mt-4 flex justify-center">
            <img src={robotImage} alt="Helper Robot" className="h-20" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StemModuleCard;
