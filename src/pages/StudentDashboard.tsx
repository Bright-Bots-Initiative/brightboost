
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import GameBackground from '../components/GameBackground';
import RobotCharacter from '../components/RobotCharacter';
import StemModuleCard from '../components/StemModuleCard';
import LeaderboardCard from '../components/LeaderboardCard';
import WordGameCard from '../components/WordGameCard';
import BrightBoostRobot from '../components/BrightBoostRobot';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const stemActivities = [
    {
      title: "Counting with Boni",
      icon: "/placeholder.svg",
      color: "bg-blue-100",
      path: "/student/modules/counting"
    },
    {
      title: "Breaking Words",
      icon: "/placeholder.svg",
      color: "bg-green-100",
      path: "/student/modules/words"
    },
    {
      title: "Reading with Boni",
      icon: "/placeholder.svg",
      color: "bg-purple-100",
      path: "/student/modules/reading"
    },
    {
      title: "Color Names",
      icon: "/placeholder.svg",
      color: "bg-yellow-100",
      path: "/student/modules/colors"
    }
  ];

  const leaderboardEntries = [
    { rank: 1, name: "Kiki", points: 150, avatar: "/placeholder.svg" },
    { rank: 2, name: "Grace", points: 99, avatar: "/placeholder.svg" },
    { rank: 3, name: "Nico", points: 98, avatar: "/placeholder.svg" },
    { rank: 4, name: "John", points: 97 },
    { rank: 5, name: "Quincy", points: 96 },
    { rank: 6, name: "Adam", points: 95 }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col relative z-10">
        <nav className="bg-brightboost-lightblue text-brightboost-navy p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Bright Boost</h1>
              <BrightBoostRobot size="sm" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 bg-brightboost-yellow px-3 py-1 rounded-full">
                <span className="text-sm font-bold">Level 1</span>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full">{user?.name || 'Student'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-brightboost-blue px-3 py-1 rounded-lg hover:bg-brightboost-blue/80 transition-colors text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4 flex-grow">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-brightboost-navy">Hello, {user?.name || 'Friend'}!</h2>
              <p className="text-brightboost-navy">Let's learn and have fun!</p>
            </div>
            <div className="flex gap-2">
              <div className="badge bg-brightboost-blue text-white px-2 py-1 rounded-full text-xs">XP: 120/200</div>
              <div className="badge bg-brightboost-yellow text-brightboost-navy px-2 py-1 rounded-full text-xs">Stars: 25</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* STEM 1 Module Card */}
            <StemModuleCard 
              title="STEM 1" 
              subtitle="Let's play with us!" 
              activities={stemActivities}
            />
            
            {/* Word Game Card */}
            <WordGameCard 
              title="Letter Game" 
              letters={['A', 'B', 'E', 'L', 'T']} 
              word="TABLE"
            />
            
            {/* Leaderboard Card */}
            <LeaderboardCard
              title="Leaderboard"
              entries={leaderboardEntries}
            />
          </div>
          
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-4">
              <RobotCharacter type="helper" size="lg" />
              <RobotCharacter type="friend" size="lg" />
              <RobotCharacter type="teacher" size="lg" />
            </div>
          </div>
        </main>
      </div>
    </GameBackground>
  );
};

export default StudentDashboard;
