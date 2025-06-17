import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useApi } from "../services/api";
import GameBackground from "../components/GameBackground";
import StemModuleCard from "../components/StemModuleCard";
import LeaderboardCard from "../components/LeaderboardCard";
import WordGameCard from "../components/WordGameCard";
import BrightBoostRobot from "../components/BrightBoostRobot";

interface Course {
  id: string;
  name: string;
  grade: string;
  teacher: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed';
}

interface StudentDashboardData {
  message: string;
  courses: Course[];
  assignments: Assignment[];
}

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showStillLoading, setShowStillLoading] = useState(false);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowStillLoading(false);
      
      const timeoutId = setTimeout(() => {
        setShowStillLoading(true);
      }, 10000);
      
      const data = await api.get('/api/student/dashboard');
      clearTimeout(timeoutId);
      setDashboardData(data);
    } catch (err: any) {
      if (err.message === 'Session expired') {
        logout();
        navigate('/student/login');
        return;
      }
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setIsLoading(false);
      setShowStillLoading(false);
    }
  };

  const handleEarnXp = async (amount: number, reason: string) => {
    try {
      const response = await api.post("/api/gamification/award-xp", {
        amount,
        reason,
      });

      if (response.success) {
        console.log(`Earned ${response.xpGained} XP! Total: ${response.xp}`);
        if (response.leveledUp) {
          console.log(`Level up! New level: ${response.level}`);
        }
      }
    } catch (err) {
      console.error("Failed to award XP:", err);
    }
  };

  const stemActivities = [
    {
      title: 'STEM 1',
      icon: '/icons/math.png',
      color: 'bg-blue-100 hover:bg-blue-200',
      path: '/activities/math'
    },
    {
      title: 'Science Lab',
      icon: '/icons/science.png',
      color: 'bg-green-100 hover:bg-green-200',
      path: '/activities/science'
    },
    {
      title: 'Coding Fun',
      icon: '/icons/coding.png',
      color: 'bg-purple-100 hover:bg-purple-200',
      path: '/activities/coding'
    }
  ];

  const leaderboardEntries = [
    { rank: 1, name: 'Alex', points: 1250, avatar: '/avatars/alex.png' },
    { rank: 2, name: 'Sarah', points: 1180, avatar: '/avatars/sarah.png' },
    { rank: 3, name: 'Mike', points: 1050, avatar: '/avatars/mike.png' },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (isLoading) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div data-testid="loading-spinner" className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brightboost-blue mx-auto mb-4"></div>
            <p className="text-brightboost-navy">Loading your dashboard...</p>
            {showStillLoading && (
              <p className="text-brightboost-navy/70 mt-2">Still loading...</p>
            )}
          </div>
        </div>
      </GameBackground>
    );
  }

  if (error) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div data-testid="dashboard-error" className="text-center">
            <p className="text-red-600 mb-4">Oops! {error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-brightboost-blue text-white px-4 py-2 rounded-lg hover:bg-brightboost-blue/80"
            >
              Try Again
            </button>
          </div>
        </div>
      </GameBackground>
    );
  }
  
  return (
    <GameBackground>
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <BrightBoostRobot className="w-16 h-16" />
              <div>
                <h1 className="text-3xl font-bold text-brightboost-navy">
                  Hello, {user?.name || 'Student'}!
                </h1>
                <p className="text-brightboost-blue">Ready to learn something new today?</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 bg-brightboost-yellow px-3 py-1 rounded-full">
                <span className="text-sm font-bold">
                  Level {user?.level || "Explorer"}
                </span>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                  {user?.name || "Student"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StemModuleCard 
              title="STEM 1" 
              subtitle="Let's play with us!" 
              activities={stemActivities}
            />
            
            <WordGameCard 
              title="Letter Game" 
              letters={['A', 'B', 'E', 'L', 'T']} 
              word="TABLE"
            />
            
            <LeaderboardCard
              title="Leaderboard"
              entries={leaderboardEntries}
            />
          </div>
          
          {dashboardData && (dashboardData.courses?.length || dashboardData.assignments?.length) && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-brightboost-navy mb-4">Your Courses & Assignments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4 shadow-md">
                  <h4 className="font-bold text-brightboost-navy mb-3">Enrolled Courses</h4>
                  {dashboardData.courses && dashboardData.courses.map((course) => (
                    <div key={course.id} className="mb-2 p-2 bg-brightboost-lightblue/20 rounded" data-cy="course-item">
                      <div className="font-medium">{course.name}</div>
                      <div className="text-sm text-gray-600">Grade: {course.grade} | Teacher: {course.teacher}</div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-md">
                  <h4 className="font-bold text-brightboost-navy mb-3">Recent Assignments</h4>
                  {dashboardData.assignments && dashboardData.assignments.map((assignment) => (
                    <div key={assignment.id} className="mb-2 p-2 bg-brightboost-lightblue/20 rounded" data-cy="assignment-item">
                      <div className="font-medium">{assignment.title}</div>
                      <div className="text-sm text-gray-600">
                        Due: {assignment.dueDate} | 
                        <span className={`ml-1 ${assignment.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}>
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {(!dashboardData || (!dashboardData.courses?.length && !dashboardData.assignments?.length)) && !isLoading && !error && (
            <div className="mt-8 text-center">
              <p className="text-brightboost-navy">Let's start your first quest!</p>
            </div>
          )}
          
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-4">
              <button className="bg-brightboost-blue hover:bg-brightboost-blue/80 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                Start Learning
              </button>
              <button className="bg-brightboost-green hover:bg-brightboost-green/80 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                View Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default StudentDashboard;
