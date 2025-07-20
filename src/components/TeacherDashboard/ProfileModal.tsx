import React, { useState, useEffect } from "react";
import {
  X,
  User,
  School,
  BookOpen,
  Mail,
  Calendar,
  Loader2,
} from "lucide-react";
import { profileService, UserProfile } from "../../services/profileService";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  isTeacherProfile?: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  studentId,
  isTeacherProfile = false,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen, studentId]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use mock data for now - in production, this would call the real API
      const profileData = await profileService.getMockProfile();
      setProfile(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-brightboost-navy flex items-center">
            <User className="w-5 h-5 mr-2" />
            {isTeacherProfile ? "Teacher Profile" : "Student Profile"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-brightboost-blue" />
              <span className="ml-2 text-gray-600">Loading profile...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">
                <User className="w-12 h-12 mx-auto mb-2" />
                <p className="font-medium">Failed to load profile</p>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
              </div>
              <button
                onClick={loadProfile}
                className="px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Avatar and Basic Info */}
              <div className="text-center">
                <div className="w-20 h-20 bg-brightboost-light rounded-full flex items-center justify-center mx-auto mb-4">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-brightboost-blue" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-brightboost-navy">
                  {profile.name}
                </h3>
                <p className="text-sm text-gray-600 capitalize">
                  {profile.role}
                </p>
              </div>

              {/* Profile Details */}
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-brightboost-blue mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                  </div>
                </div>

                {profile.school && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <School className="w-5 h-5 text-brightboost-green mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        School
                      </p>
                      <p className="text-sm text-gray-600">{profile.school}</p>
                    </div>
                  </div>
                )}

                {profile.subject && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <BookOpen className="w-5 h-5 text-brightboost-yellow mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Subject
                      </p>
                      <p className="text-sm text-gray-600">{profile.subject}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Member Since
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(profile.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
