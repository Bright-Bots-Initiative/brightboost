interface UserProfile {
  id: string;
  name: string;
  email: string;
  school?: string;
  subject?: string;
  role: string;
  avatar?: string;
  created_at: string;
}

interface UpdateProfileData {
  name: string;
  school?: string;
  subject?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
  user?: T;
}

class ProfileService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_REACT_APP_API_BASE_URL || 'https://api.brightboost.com';
  }

  private setAuthToken(token: string) {
    this.token = token;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async getProfile(): Promise<UserProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 404) {
          throw new Error('Profile not found');
        }
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }

      const data: UserProfile = await response.json();
      return data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch profile');
    }
  }

  async updateProfile(profileData: UpdateProfileData): Promise<UserProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/edit-profile`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid profile data');
        }
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      const data: ApiResponse<UserProfile> = await response.json();
      if (data.success && data.user) {
        return data.user;
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Profile update error:', error);
      throw error instanceof Error ? error : new Error('Failed to update profile');
    }
  }

  // Mock implementation for development
  async getMockProfile(): Promise<UserProfile> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: 'user-123',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@brightboost.com',
      school: 'Lincoln Elementary School',
      subject: 'STEM Education',
      role: 'teacher',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
      created_at: '2024-01-15T08:00:00Z'
    };
  }

  async updateMockProfile(profileData: UpdateProfileData): Promise<UserProfile> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      id: 'user-123',
      name: profileData.name,
      email: 'sarah.johnson@brightboost.com',
      school: profileData.school,
      subject: profileData.subject,
      role: 'teacher',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
      created_at: '2024-01-15T08:00:00Z'
    };
  }
}

export const profileService = new ProfileService();
export type { UserProfile, UpdateProfileData };