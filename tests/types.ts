
import type { Application } from 'express';

export interface UserOverrides {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: 'teacher' | 'student';
  xp?: number;
  level?: number;
  streak?: number;
}

export interface LessonOverrides {
  id?: string;
  title?: string;
  content?: string;
  category?: string;
  date?: string;
  status?: string;
  teacherId?: string;
}

export interface ActivityOverrides {
  studentId?: string;
  lessonId?: string;
  completed?: boolean;
  grade?: string;
  completedAt?: Date;
}

export interface BadgeOverrides {
  name?: string;
  description?: string;
  criteria?: string;
  imageUrl?: string;
}

export interface BadgeData {
  id: string;
  name: string;
}

export interface LessonData {
  title: string;
  content: string;
  category: string;
  date: string;
  status: string;
}

export interface UserData {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: string;
  xp?: number;
  level?: number;
  streak?: number;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    xp: number;
    level: number;
    streak: number;
  };
}

export interface GamificationProfile {
  id: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  badges: BadgeData[];
}

export interface XpResponse {
  success: boolean;
  xp: number;
  level: number;
  levelUp?: boolean;
}

export interface StreakResponse {
  success: boolean;
  streak: number;
  streakXp: number;
  milestone?: boolean;
  xp: number;
}

export interface BadgeResponse {
  success: boolean;
  badge: BadgeData;
}

export type TestExpressApp = Application;
