import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { User, Mail, School, BookOpen, Calendar, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  school?: string;
  subject?: string;
  role: string;
  created_at: string;
}

export default function ProfileView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/api/profile");
        setProfile(response.data);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('401')) {
            setError("Session expired. Please log in again.");
          } else if (err.message.includes('503')) {
            setError("Connection issues. Please try again later.");
          } else {
            setError("Failed to load profile");
          }
        } else {
          setError("Failed to load profile");
        }
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [api]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-300 rounded w-48"></div>
              <div className="h-4 bg-gray-300 rounded w-64"></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 rounded w-24"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-500 mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Profile</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No profile data available</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold text-brightboost-navy">My Profile</h1>
        <Link
          to="/teacher/settings/profile/edit"
          className="inline-flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors shadow-md hover:shadow-lg"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-brightboost-blue to-brightboost-navy px-8 py-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <img 
                src={profile.avatarUrl || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'} 
                alt="Profile" 
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop';
                }}
              />
              <div className="absolute -bottom-2 -right-2 bg-brightboost-green rounded-full p-2">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-white">
              <h2 className="text-3xl font-bold">{profile.name}</h2>
              <p className="text-brightboost-light text-lg capitalize">{profile.role}</p>
              <p className="text-brightboost-light text-sm mt-1">
                Member since {formatDate(profile.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="p-8">
          <h3 className="text-xl font-semibold text-brightboost-navy mb-6">Profile Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-brightboost-blue" />
                <div>
                  <p className="text-sm text-gray-600">Email Address</p>
                  <p className="font-medium text-gray-900">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <School className="w-5 h-5 text-brightboost-green" />
                <div>
                  <p className="text-sm text-gray-600">School</p>
                  <p className="font-medium text-gray-900">{profile.school || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-brightboost-yellow" />
                <div>
                  <p className="text-sm text-gray-600">Subject</p>
                  <p className="font-medium text-gray-900">{profile.subject || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-brightboost-red" />
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="font-medium text-gray-900 font-mono text-sm">{profile.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8">
            <Link
              to="/teacher/settings/profile/edit"
              className="inline-flex items-center px-6 py-3 bg-brightboost-blue text-white font-medium rounded-md hover:bg-brightboost-navy transition-colors shadow-md hover:shadow-lg"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}