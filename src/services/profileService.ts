// src/services/profileService.ts
import { API_BASE, join } from "./api";

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
  private get baseUrl(): string {
    return API_BASE;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = localStorage.getItem("bb_access_token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async getProfile(userId?: string): Promise<UserProfile> {
    try {
      const endpoint = userId ? `/users/${userId}` : `/profile`;
      const url = join(this.baseUrl, endpoint);

      const response = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        if (response.status === 403) {
          throw new Error("You do not have permission to view this profile");
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
      const url = join(this.baseUrl, "/edit-profile");

      const response = await fetch(url, {
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
          // Zod error format or simple error
          const msg = Array.isArray(errorData.error)
            ? errorData.error.map((e: any) => e.message).join(", ")
            : errorData.error || "Invalid profile data";
          throw new Error(msg);
        }
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      const data: ApiResponse<UserProfile> = await response.json();
      if (data.success && data.user) {
        return data.user;
      }

      // Sometimes API might return the user object directly depending on implementation
      // My backend implementation returns { success: true, user: ... }

      throw new Error("Invalid response format");
    } catch (error) {
      console.error("Profile update error:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to update profile");
    }
  }

  // Mock implementation for development - kept for fallback or reference, but unused in main flow now
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
