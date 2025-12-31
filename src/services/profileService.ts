// src/services/profileService.ts
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

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE ?? "/api";
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Get token from localStorage as used in AuthContext
    const token = localStorage.getItem("bb_access_token");

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async getProfile(): Promise<UserProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/profile`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        if (response.status === 404) {
          throw new Error("Profile not found");
        }
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }

      const data: UserProfile = await response.json();
      return data;
    } catch (error) {
      console.error("Profile fetch error:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch profile");
    }
  }

  async updateProfile(profileData: UpdateProfileData): Promise<UserProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/edit-profile`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Invalid profile data");
        }
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      const data: ApiResponse<UserProfile> = await response.json();
      if (data.success && data.user) {
        return data.user;
      }

      throw new Error("Invalid response format");
    } catch (error) {
      console.error("Profile update error:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to update profile");
    }
  }

  // Mock methods are removed or deprecated
  async getMockProfile(): Promise<UserProfile> {
    return this.getProfile();
  }

  async updateMockProfile(
    profileData: UpdateProfileData,
  ): Promise<UserProfile> {
    return this.updateProfile(profileData);
  }
}

export const profileService = new ProfileService();
export type { UserProfile, UpdateProfileData };
