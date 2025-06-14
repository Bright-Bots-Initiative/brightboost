import { http, HttpResponse } from "msw";
import { Lesson } from "../src/components/TeacherDashboard/types";

const API_URL = "http://localhost:3000";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface LessonCreateRequest {
  title: string;
  category: string;
  content?: string;
  status?: string;
}

const mockLessons = [
  {
    id: "1",
    title: "Introduction to Algebra",
    category: "Math",
    date: "2025-05-01",
    status: "Published",
    content: "Algebra lesson content",
  },
  {
    id: "2",
    title: "Advanced Geometry",
    category: "Math",
    date: "2025-05-10",
    status: "Draft",
    content: "Geometry lesson content",
  },
  {
    id: "3",
    title: "Chemistry Basics",
    category: "Science",
    date: "2025-05-15",
    status: "Review",
    content: "Chemistry lesson content",
  },
];

export const handlers = [
  http.get(`${API_URL}/api/teacher/dashboard`, () => {
    return HttpResponse.json({
      lessons: mockLessons,
    });
  }),

  http.post(`${API_URL}/auth/login`, () => {
    const response: AuthResponse = {
      token: "mock-jwt-token",
      user: {
        id: "1",
        name: "Test Teacher",
        email: "teacher@example.com",
        role: "teacher",
      },
    };
    return HttpResponse.json(response);
  }),

  http.post(`${API_URL}/auth/signup`, () => {
    const response: AuthResponse = {
      token: "mock-jwt-token",
      user: {
        id: "1",
        name: "Test Teacher",
        email: "teacher@example.com",
        role: "teacher",
      },
    };
    return HttpResponse.json(response);
  }),

  http.post(`${API_URL}/api/lessons`, async ({ request }) => {
    const requestBody = (await request.json()) as LessonCreateRequest;
    const newLesson: Lesson = {
      id: "4",
      ...requestBody,
      date: new Date().toISOString().split("T")[0],
      status: requestBody.status || "Draft",
    };

    return HttpResponse.json(newLesson, { status: 201 });
  }),

  http.put(`${API_URL}/api/lessons/:id`, async ({ params, request }) => {
    const requestBody = (await request.json()) as Partial<Lesson>;
    return HttpResponse.json({
      id: params.id,
      ...requestBody,
    });
  }),

  http.delete(`${API_URL}/api/lessons/:id`, () => {
    return HttpResponse.json({ success: true });
  }),
];
