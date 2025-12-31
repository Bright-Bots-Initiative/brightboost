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
    this.baseUrl =
      import.meta.env.VITE_REACT_APP_API_BASE_URL ||
      (import.meta.env.VITE_API_BASE ?? "/api");
    // Use existing pattern from api.ts or default to /api if env vars are missing/different
    if (this.baseUrl.startsWith("http")) {
      // If it's a full URL, keep it. If it's relative, it will use current origin.
    } else {
      // Ensure leading slash if relative
      if (!this.baseUrl.startsWith("/")) this.baseUrl = "/" + this.baseUrl;
    }

    // Alignment with api.ts which constructs API_BASE more dynamically
    // But for now, simple relative path /api usually works if proxy is set up or same origin.
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
      // Ensure baseUrl doesn't have trailing slash and endpoint starts with slash, or handle it.
      // this.baseUrl might be "/api"
      const url = `${this.baseUrl.replace(/\/$/, "")}${endpoint}`;

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
      const url = `${this.baseUrl.replace(/\/$/, "")}/edit-profile`;

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
