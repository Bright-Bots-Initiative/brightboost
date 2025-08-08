// src/types/Lesson.ts
export interface Lesson {
  id: string;
  title: string;
  date: string;
  studentCount?: number;
  status?: string;
}
