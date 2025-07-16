import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import { User, School, BookOpen, Save, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

interface UserProfile {
  name: string;
  school?: string;
  subject?: string;
}

export default function ProfileEdit() {
  const [profile, setProfile] = useState<UserProfile>({ name: '', school: '', subject: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const api = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/api/profile");
        setProfile({
          name: response.data.name || '',
          school: response.data.school || '',
          subject: response.data.subject || ''
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!profile.name || profile.name.trim() === '') {
      setError('Name is required');
      return;
    }
    
    if (profile.name.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        name: profile.name.trim(),
        school: profile.school?.trim() || null,
        subject: profile.subject?.trim() || null
      };

      await api.put("/api/profile", payload);
      setSuccess(true);
      
      // Auto-redirect after success
      setTimeout(() => {
        navigate('/teacher/settings/profile');
      }, 1500);
      
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('400')) {
          setError("Invalid data provided. Please check your inputs.");
        } else if (err.message.includes('401')) {
          setError("Session expired. Please log in again.");
        } else if (err.message.includes('503')) {
          setError("Connection issues. Please try again later.");
        } else {
          setError("Failed to update profile. Please try again.");
        }
      } else {
        setError("Failed to update profile. Please try again.");
      }
      console.error('Profile update error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-48 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-10 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-10 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-10 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/settings/profile')}
          className="text-brightboost-blue hover:text-brightboost-navy transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-brightboost-navy">Edit Profile</h1>
      </div>
      
      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-red-800 font-medium">Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-green-800 font-medium">Success!</h4>
            <p className="text-green-700 text-sm mt-1">Profile updated successfully. Redirecting...</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2 text-brightboost-blue" />
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={profile.name}
              onChange={handleChange}
              required
              maxLength={50}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue transition-colors"
              placeholder="Enter your full name"
            />
            <p className="text-xs text-gray-500 mt-1">
              {profile.name.length}/50 characters
            </p>
          </div>
          
          <div>
            <label htmlFor="school" className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <School className="w-4 h-4 mr-2 text-brightboost-green" />
              School
            </label>
            <input
              type="text"
              id="school"
              name="school"
              value={profile.school}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue transition-colors"
              placeholder="Enter your school name"
            />
          </div>
          
          <div>
            <label htmlFor="subject" className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4 mr-2 text-brightboost-yellow" />
              Subject/Specialization
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={profile.subject}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue transition-colors"
              placeholder="e.g., Mathematics, Science, STEM Education"
            />
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/teacher/settings/profile')}
            disabled={submitting}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || success}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brightboost-blue hover:bg-brightboost-navy focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brightboost-blue disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Important Notice */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <div className="text-blue-500 mr-3">ℹ️</div>
          <div>
            <h4 className="text-blue-800 font-medium text-sm">Important</h4>
            <p className="text-blue-700 text-xs mt-1">
              Profile updates will not affect your STEM-1 class data or student progress tracking. 
              All teaching metrics and CSV exports remain unchanged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}