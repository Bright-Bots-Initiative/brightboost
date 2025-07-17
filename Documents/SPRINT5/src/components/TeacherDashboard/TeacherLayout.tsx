import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GameBackground from '../GameBackground';
import Sidebar from './Sidebar';
import TeacherNavbar from './TeacherNavbar';

const TeacherLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col relative z-10">
        <TeacherNavbar
          userName={user?.name || 'Teacher'}
          onLogout={handleLogout}
        />
        <Sidebar />
        <main className="flex-grow ml-64 p-6">{children}</main>
      </div>
    </GameBackground>
  );
};

export default TeacherLayout;
