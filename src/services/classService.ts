// src/services/classService.ts
import type { Class } from "../components/TeacherDashboard/types";

class ClassService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_REACT_APP_API_BASE_URL || "https://api.brightboost.com";
    this.token = this.getTokenFromStorage();
  }

  setToken(token: string) {
    this.token = token;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async getTeacherClasses(teacherId: string): Promise<Class[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/teachers/${teacherId}/classes`,
        {
          method: "GET",
          headers: this.getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Class fetch failed: ${response.statusText} – ${text}`);
      }

      const result = await response.json();
      return result.classes ?? [];
    } catch (error) {
      console.error("Class fetch error:", error);
      throw error instanceof Error ? error : new Error("Fetch error");
    }
  }

  private getTokenFromStorage(): string | null {
    return localStorage.getItem("access_token") ?? null;
  }
}

export const classService = new ClassService();
