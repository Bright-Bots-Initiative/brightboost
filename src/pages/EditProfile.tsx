import React, { useState, useEffect, useCallback } from "react";
import { User, Mail, School, BookOpen, Save, ArrowLeft, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "../services/api";
import GameBackground from "../components/GameBackground";
import BrightBoostRobot from "../components/BrightBoostRobot";

interface ProfileFormData {
  name: string;
  school: string;
  subject: string;
  avatar?: string;
}

const EditProfile: React.FC = () => {
  const { user } = useAuth();
  const api = useApi();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    school: '',
    subject: '',
    avatar: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/profile");
      console.log("Edit Profile - API response:", response);
      
      if (response && typeof response === 'object') {
        // Handle both direct response and nested data structure
        const profileInfo = response.data || response;
        setFormData({
          name: profileInfo.name || user?.name || '',
          school: profileInfo.school || 'Bright Boost Academy',
          subject: profileInfo.subject || 'STEM Education',
          avatar: profileInfo.avatar || profileInfo.avatarUrl || "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
        });
      } else {
        // Fallback to auth context data
        setFormData({
          name: user?.name || '',
          school: 'Bright Boost Academy',
          subject: 'STEM Education',
          avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
        });
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      // Fallback to auth context data
      setFormData({
        name: user?.name || '',
        school: 'Bright Boost Academy',
        subject: 'STEM Education',
        avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      setError('Name is required');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        school: formData.school?.trim() || null,
        subject: formData.subject?.trim() || null
      };

      console.log("Sending PUT request with payload:", payload);
      const response = await api.put("/api/profile", payload);
      console.log("Profile update response:", response);
      
      if (response && (response.success || response.user)) {
        setSuccessMessage("Profile updated successfully!");
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [api, formData]);

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

  return (
    <GameBackground>
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-brightboost-blue to-brightboost-navy px-8 py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => window.history.back()}
                  className="text-white hover:text-brightboost-light transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
                  <p className="text-brightboost-light">Update your information</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-8">
              {/* Status Messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-green-700 text-sm">{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <img
                      src={formData.avatar || "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"}
                      alt="Profile"
                      className="w-20 h-20 rounded-full border-4 border-gray-200 shadow-md object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop";
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-brightboost-blue rounded-full p-1.5">
                      <Camera className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Picture URL
                    </label>
                    <input
                      type="url"
                      name="avatar"
                      value={formData.avatar}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue transition-colors"
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Note: Avatar updates are display-only and won't be saved to the database</p>
                  </div>
                </div>

                {/* Name Field */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2 text-brightboost-blue" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* School Field */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <School className="w-4 h-4 mr-2 text-brightboost-green" />
                    School
                  </label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue transition-colors"
                    placeholder="Enter your school name"
                  />
                </div>

                {/* Subject Field */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4 mr-2 text-brightboost-yellow" />
                    Subject/Specialization
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue transition-colors"
                    placeholder="e.g., Mathematics, Science, STEM Education"
                  />
                </div>

                {/* Email Display (Read-only) */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || 'Not available'}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed from this form</p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-6">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-brightboost-blue text-white font-medium rounded-md hover:bg-brightboost-navy transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </GameBackground>
  );
};

export default EditProfile;