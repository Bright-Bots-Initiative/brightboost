// src/api/lessons.ts
import { Lesson } from '../components/TeacherDashboard/types';

const API_BASE =
  import.meta.env.VITE_AWS_API_URL || 'https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod';

export async function fetchLessons(): Promise<{ lessons: Lesson[] }> {
  try {
    const response = await fetch(`${API_BASE}/lessons`);
    if (!response.ok) {
      throw new Error(`Failed to fetch lessons: ${response.statusText}`);
    }
    const data = await response.json();
    // Defensive: ensure we always return an array
    return { lessons: Array.isArray(data.lessons) ? data.lessons : [] };
  } catch (err) {
    // Optional: log error somewhere
    return { lessons: [] };
  }
}
