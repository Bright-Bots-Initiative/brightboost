import React, { useEffect, useState, useCallback } from "react";
import { User, Mail, School, BookOpen, Calendar, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "../services/api";
import GameBackground from "../components/GameBackground";
import BrightBoostRobot from "../components/BrightBoostRobot";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  school?: string;
  subject?: string;
  avatar?: string;
  role: string;
  created_at?: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const api = useApi();

  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/profile");
      console.log("Profile API response:", response);
      
      if (response && typeof response === 'object') {
        // Handle both direct response and nested data structure
        const profileInfo = response.data || response;
        setProfileData({
          id: profileInfo.id || user?.id || '1',
          name: profileInfo.name || user?.name || 'User',
          email: profileInfo.email || user?.email || 'user@brightboost.com',
          role: profileInfo.role || user?.role || 'teacher',
          avatar: profileInfo.avatar || profileInfo.avatarUrl || "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
          school: profileInfo.school || "Bright Boost Academy",
          subject: profileInfo.subject || "STEM Education",
          created_at: profileInfo.created_at || "2025-01-01"
        });
      } else {
        // Fallback to auth context data if API response is unexpected
        if (user) {
          setProfileData({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
            school: "Bright Boost Academy",
            subject: "STEM Education",
            created_at: "2025-01-01"
          });
        } else {
          setError("No profile data available");
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile data:", err);
      // Fallback to auth context data on error
      if (user) {
        setProfileData({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
          school: "Bright Boost Academy",
          subject: "STEM Education",
          created_at: "2025-01-01"
        });
      } else {
        setError("Failed to fetch profile data");
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  if (isLoading) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BrightBoostRobot size="lg" />
            <p className="text-xl text-brightboost-navy mt-4">Loading profile...</p>
          </div>
        </div>
      </GameBackground>
    );
  }

  if (error && !profileData) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BrightBoostRobot size="lg" />
            <p className="text-xl text-red-600 mt-4">Error: {error}</p>
            <button
              onClick={fetchProfileData}
              className="mt-4 px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </GameBackground>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'January 2025';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    } catch {
      return 'January 2025';
    }
  };

  return (
    <GameBackground>
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back button for standalone access */}
          <div className="mb-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center text-brightboost-blue hover:text-brightboost-navy transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-brightboost-blue to-brightboost-navy px-8 py-12">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img
                    src={profileData?.avatar || "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"}
                    alt="Profile"
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop";
                    }}
                  />
                  <div className="absolute -bottom-2 -right-2 bg-brightboost-green rounded-full p-2">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-white">
                  <h1 className="text-3xl font-bold">{profileData?.name || 'User'}</h1>
                  <p className="text-brightboost-light text-lg capitalize">{profileData?.role || 'Teacher'}</p>
                  <p className="text-brightboost-light text-sm mt-1">
                    Member since {formatDate(profileData?.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-brightboost-navy mb-6">Profile Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-brightboost-blue" />
                    <div>
                      <p className="text-sm text-gray-600">Email Address</p>
                      <p className="font-medium text-gray-900">{profileData?.email || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <School className="w-5 h-5 text-brightboost-green" />
                    <div>
                      <p className="text-sm text-gray-600">School</p>
                      <p className="font-medium text-gray-900">{profileData?.school || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <BookOpen className="w-5 h-5 text-brightboost-yellow" />
                    <div>
                      <p className="text-sm text-gray-600">Subject</p>
                      <p className="font-medium text-gray-900">{profileData?.subject || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-brightboost-red" />
                    <div>
                      <p className="text-sm text-gray-600">User ID</p>
                      <p className="font-medium text-gray-900 font-mono text-sm">{profileData?.id || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex space-x-4">
                <a
                  href="/edit-profile"
                  className="inline-flex items-center px-6 py-3 bg-brightboost-blue text-white font-medium rounded-md hover:bg-brightboost-navy transition-colors shadow-md hover:shadow-lg"
                >
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </a>
                <button
                  onClick={fetchProfileData}
                  className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
                >
                  Refresh Data
                </button>
              </div>
            </div>

            {/* Debug Information (only in development) */}
            {process.env.NODE_ENV === 'development' && profileData && (
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Debug Information</h3>
                <pre className="text-xs text-gray-600 bg-white p-4 rounded border overflow-auto">
                  {JSON.stringify(profileData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default Profile;