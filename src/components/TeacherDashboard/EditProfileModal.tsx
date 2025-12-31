import React, { useState, useEffect } from "react";
import {
  X,
  User,
  School,
  BookOpen,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  profileService,
  UserProfile,
  UpdateProfileData,
} from "../../services/profileService";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UpdateProfileData>({
    name: "",
    school: "",
    subject: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const firstInput = document.querySelector(
        "#edit-profile-name",
      ) as HTMLInputElement;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const profileData = await profileService.getProfile();
      setProfile(profileData);
      setFormData({
        name: profileData.name,
        school: profileData.school || "",
        subject: profileData.subject || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateProfileData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedProfile = await profileService.updateProfile(formData);
      setProfile(updatedProfile);
      setSaveSuccess(true);

      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }

      // Auto-close after successful save
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSaveSuccess(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2
            id="edit-profile-title"
            className="text-xl font-semibold text-brightboost-navy flex items-center"
          >
            <User className="w-5 h-5 mr-2" />
            Edit Profile
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close edit profile modal"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div
              className="flex items-center justify-center py-8"
              aria-live="polite"
            >
              <Loader2 className="w-8 h-8 animate-spin text-brightboost-blue" />
              <span className="ml-2 text-gray-600">Loading profile...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Avatar Display */}
              {profile && (
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
                  <p className="text-sm text-gray-600">{profile.email}</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-profile-name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <User className="w-4 h-4 inline mr-1" />
                    Full Name *
                  </label>
                  <input
                    id="edit-profile-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue focus:outline-none"
                    placeholder="Enter your full name"
                    aria-describedby={
                      error && !formData.name.trim() ? "name-error" : undefined
                    }
                    aria-invalid={
                      error && !formData.name.trim() ? "true" : "false"
                    }
                    required
                  />
                  {error && !formData.name.trim() && (
                    <p
                      id="name-error"
                      className="mt-1 text-sm text-red-600 flex items-center"
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Name is required
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="edit-profile-school"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <School className="w-4 h-4 inline mr-1" />
                    School
                  </label>
                  <input
                    id="edit-profile-school"
                    type="text"
                    value={formData.school}
                    onChange={(e) =>
                      handleInputChange("school", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue focus:outline-none"
                    placeholder="Enter your school name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-profile-subject"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <BookOpen className="w-4 h-4 inline mr-1" />
                    Subject
                  </label>
                  <input
                    id="edit-profile-subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      handleInputChange("subject", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue focus:outline-none"
                    placeholder="Enter your subject area"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  className="p-3 bg-red-50 border border-red-200 rounded-md"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {saveSuccess && (
                <div
                  className="p-3 bg-green-50 border border-green-200 rounded-md"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm text-green-700">
                    Profile updated successfully!
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.name.trim()}
                  className="px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors disabled:opacity-50 flex items-center focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
