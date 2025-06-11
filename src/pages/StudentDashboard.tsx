
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../services/api'; // Import useApi
import GameBackground from '../components/GameBackground';
import RobotCharacter from '../components/RobotCharacter';
// import StemModuleCard, { ActivityProps as StemActivityDisplayProps } from '../components/StemModuleCard'; // Not used for activities currently
import WordGameCard from '../components/WordGameCard'; // Assuming this is a static or separate feature
import BrightBoostRobot from '../components/BrightBoostRobot';
import { Button } from '@/components/ui/button'; // For "Mark Complete"

// Define types for fetched data (mirroring backend structure)
interface Lesson {
  id: string | number;
  title: string;
  content?: string;
  category?: string;
  date?: string;
  status?: string;
  // Student-specific progress
  completed?: boolean;
  grade?: number | null;
}

interface StudentActivity {
  id: string | number;
  studentId: string | number;
  lessonId: string | number;
  completed: boolean;
  grade: number | null;
  // Potentially enrich with lesson title for display
  lessonTitle?: string; 
}

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useApi();

  const [enrolledLessons, setEnrolledLessons] = useState<Lesson[]>([]);
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [studentName] = useState<string>(user?.name || 'Student');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      const timeoutId = setTimeout(() => {
        console.log('StudentDashboard: Timeout triggered after 5 seconds');
        setError('Request timeout. API may not be available in test environment.');
        setIsLoading(false);
      }, 5000); // 5 second timeout for faster test execution
      
      try {
        console.log('StudentDashboard: Starting API call to /api/student_dashboard');
        const data = await api.get('/api/student_dashboard');
        console.log('StudentDashboard: API call successful, data:', data);
        clearTimeout(timeoutId); // Clear timeout if request succeeds
        
        if (Array.isArray(data)) {
          const formattedLessons = data.map((student: { id: string; name: string; email: string; xp?: number; level?: number; streak?: number }) => ({
            id: String(student.id),
            title: `Student: ${student.name}`,
            content: `Level: ${student.level || 'Explorer'}, XP: ${student.xp || 0}`,
            category: 'Student Profile',
            completed: false,
            grade: null
          }));
          setEnrolledLessons(formattedLessons);
          setStudentActivities([]);
        } else {
          setEnrolledLessons([]);
          setStudentActivities([]);
        }
      } catch (err) {
        clearTimeout(timeoutId); // Clear timeout if request fails
        console.error("StudentDashboard: Failed to fetch student dashboard data:", err);
        if (err instanceof Error && err.message.includes('404')) {
          setError('API not available in preview mode. Student data will be shown in production.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard. Please try again.');
        }
      } finally {
        console.log('StudentDashboard: Setting isLoading to false');
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [api, user?.name]);

  const handleEarnXp = async (amount: number, reason: string) => {
    try {
      const response = await api.post('/api/gamification/award-xp', {
        amount,
        reason
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

  const handleMarkActivityComplete = async (activityId: string | number) => {
    try {
      const updatedActivity = await api.post(`/api/student/activities/${activityId}/complete`, {});
      setStudentActivities(prevActivities =>
        prevActivities.map(activity =>
          activity.id === activityId ? { ...activity, ...updatedActivity } : activity
        )
      );
      
      handleEarnXp(25, `Completed activity ${activityId}`);
    } catch (err) {
      console.error("Failed to mark activity complete:", err);
      alert("Could not update activity status. Please try again.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  // const transformedActivitiesForStemCard: StemActivityDisplayProps[] = studentActivities.map(activity => ({
  //   title: activity.lessonTitle || `Activity ${activity.id}`,
  //   icon: "/placeholder.svg", 
  //   color: activity.completed ? "bg-green-200" : "bg-blue-100", 
  //   path: `/lessons/${activity.lessonId}`, 
  //   id: String(activity.id), 
  //   completed: activity.completed,
  // }));


  if (isLoading) {
    return (
      <GameBackground>
        <div className="min-h-screen flex flex-col relative z-10 items-center justify-center" data-testid="loading-spinner">
          <BrightBoostRobot size="lg" />
          <p className="text-xl text-brightboost-navy mt-4">Loading your dashboard...</p>
        </div>
      </GameBackground>
    );
  }

  if (error) {
    return (
      <GameBackground>
        <div className="min-h-screen flex flex-col relative z-10 items-center justify-center p-4" data-testid="dashboard-error">
          <BrightBoostRobot size="lg" />
          <p className="text-xl text-red-500 mt-4 text-center">Error: {error}</p>
          {error.includes('preview mode') && (
            <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
              <p className="text-sm text-yellow-800">API not available in preview mode</p>
              <p className="text-sm text-yellow-800">Student data will be shown in production</p>
            </div>
          )}
          <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
        </div>
      </GameBackground>
    );
  }

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
                <span className="text-sm font-bold">Level {user?.level || 'Explorer'}</span>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full">{studentName}</span>
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

        <main className="container mx-auto p-4 flex-grow" data-testid="student-dashboard">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-brightboost-navy">Student Dashboard</h2>
              <h3 className="text-xl text-brightboost-navy">Hello, {studentName}!</h3>
              <p className="text-brightboost-navy">Let's learn and have fun!</p>
            </div>
            <div className="flex gap-2">
              <div className="badge bg-brightboost-blue text-white px-2 py-1 rounded-full text-xs">XP: {user?.xp || 0}/200</div>
              <div className="badge bg-brightboost-yellow text-brightboost-navy px-2 py-1 rounded-full text-xs">Streak: {user?.streak || 0}</div>
            </div>
          </div>
          
          {/* Display Enrolled Lessons */}
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-brightboost-navy mb-4">Your Lessons</h3>
            {enrolledLessons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledLessons.map(lesson => (
                  <div key={lesson.id} className={`p-4 rounded-lg shadow ${lesson.completed ? 'bg-green-100' : 'bg-white'}`}>
                    <h4 className="font-bold text-lg">{lesson.title}</h4>
                    <p className="text-sm text-gray-600">{lesson.category}</p>
                    <p className="mt-2 text-xs">{lesson.content?.substring(0,100)}...</p>
                     {lesson.completed && <span className="text-green-600 font-semibold block mt-2">Completed! Grade: {lesson.grade || 'N/A'}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BrightBoostRobot size="md" />
                <p className="text-brightboost-navy mt-4">No student data available yet.</p>
                <p className="text-sm text-gray-600">This could be because you're in preview mode or no students are registered.</p>
              </div>
            )}
          </section>

          {/* Display Student Activities (mapped for StemModuleCard or custom display) */}
          <section>
             <h3 className="text-xl font-semibold text-brightboost-navy mb-4">Your Activities</h3>
            {studentActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Using a simplified card for activities for now */}
                {studentActivities.map(activity => (
                  <div key={activity.id} className={`p-4 rounded-lg shadow ${activity.completed ? 'bg-green-100' : 'bg-white'}`}>
                    <h4 className="font-bold text-lg">{activity.lessonTitle || `Activity for Lesson ${activity.lessonId}`}</h4>
                    {activity.completed ? (
                      <p className="text-green-600 font-semibold">Completed!</p>
                    ) : (
                      <Button className="mt-2 w-full" size="sm" onClick={() => handleMarkActivityComplete(activity.id)}>
                        Mark as Complete
                      </Button>
                    )}
                    {activity.grade && <p className="text-sm">Grade: {activity.grade}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BrightBoostRobot size="md" />
                <p className="text-brightboost-navy mt-4">No activities available yet.</p>
                <p className="text-sm text-gray-600">Activities will appear here when assigned by your teacher.</p>
              </div>
            )}
          </section>
          
          {/* Display user badges if they exist */}
          {user?.badges && user.badges.length > 0 && (
            <section className="mt-8">
              <h3 className="text-xl font-semibold text-brightboost-navy mb-4">Your Badges</h3>
              <div className="flex flex-wrap gap-3">
                {user.badges.map(badge => (
                  <div key={badge.id} className="badge bg-brightboost-navy text-white px-3 py-2 rounded-full">
                    {badge.name}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Static WordGameCard - assuming it's a generic game not tied to dynamic data */}
          <div className="mt-8">
             <WordGameCard 
                title="Letter Game" 
                letters={['A', 'B', 'E', 'L', 'T']} 
                word="TABLE"
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
