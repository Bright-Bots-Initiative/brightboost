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
      import.meta.env.VITE_AWS_API_URL
        ? `${import.meta.env.VITE_AWS_API_URL.replace(/\/+$/, "")}/api`
        : import.meta.env.VITE_API_BASE ?? "/api";
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem("bb_access_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

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
      const response = await fetch(`${this.baseUrl}/profile`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        if (response.status === 400) {
          const errorData = await response.json();
          const errorMessage =
            Array.isArray(errorData.error)
              ? errorData.error.map((e: any) => e.message).join(", ")
              : errorData.error || "Invalid profile data";
          throw new Error(errorMessage);
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
}

export const profileService = new ProfileService();
export type { UserProfile, UpdateProfileData };
