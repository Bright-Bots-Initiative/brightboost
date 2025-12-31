import { http, HttpResponse } from "msw";
import { Lesson } from "../components/TeacherDashboard/types";

const resolveApiBase = (): string => {
  const { VITE_API_BASE, VITE_AWS_API_URL, VITE_API_URL } = import.meta.env;

  if (VITE_API_BASE) {
    const base = VITE_API_BASE.trim().replace(/\/+$/, "");
    if (!base.startsWith("http") && !base.startsWith("/")) {
      return `/${base}`;
    }
    return base;
  }

  if (VITE_AWS_API_URL) {
    return `${VITE_AWS_API_URL.trim().replace(/\/+$/, "")}/api`;
  }

  if (VITE_API_URL) {
    const base = VITE_API_URL.trim().replace(/\/+$/, "");
    if (!base.startsWith("http") && !base.startsWith("/")) {
      return `/${base}`;
    }
    return base;
  }

  return "/api";
};

const API_BASE = resolveApiBase();

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

const loginHandler = () => {
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
};

const signupHandler = () => {
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
};

export const handlers = [
  http.get(`${API_BASE}/teacher_dashboard`, () => {
    return HttpResponse.json({
      lessons: mockLessons,
      students: [
        { id: "1", name: "John Doe", email: "john@example.com", progress: 75 },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane@example.com",
          progress: 92,
        },
        {
          id: "3",
          name: "Alex Johnson",
          email: "alex@example.com",
          progress: 45,
        },
      ],
    });
  }),

  http.get(`${API_BASE}/student_dashboard`, () => {
    return HttpResponse.json({
      studentName: "Test Student",
      enrolledLessons: mockLessons,
      activities: [
        {
          id: "1",
          studentId: "1",
          lessonId: "1",
          completed: true,
          grade: 85,
          lessonTitle: "Introduction to Algebra",
        },
        {
          id: "2",
          studentId: "1",
          lessonId: "2",
          completed: false,
          grade: null,
          lessonTitle: "Advanced Geometry",
        },
      ],
    });
  }),

  // Align with app logic (API_BASE usually includes /api)
  http.post(`${API_BASE}/login`, loginHandler),
  http.post(`${API_BASE}/signup`, signupHandler),

  // Legacy fallback for /auth paths to prevent regression if used
  http.post(`/auth/login`, loginHandler),
  http.post(`/auth/signup`, signupHandler),

  http.post(`${API_BASE}/lessons`, async ({ request }) => {
    const requestBody = (await request.json()) as LessonCreateRequest;
    const newLesson: Lesson = {
      id: "4",
      ...requestBody,
      date: new Date().toISOString().split("T")[0],
      status: requestBody.status || "Draft",
    };

    return HttpResponse.json(newLesson, { status: 201 });
  }),

  http.put(`${API_BASE}/lessons/:id`, async ({ params, request }) => {
    const requestBody = (await request.json()) as Partial<Lesson>;
    return HttpResponse.json({
      id: params.id,
      ...requestBody,
    });
  }),

  http.delete(`${API_BASE}/lessons/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.put("https://stub-bucket.s3.amazonaws.com/avatar", () => {
    return HttpResponse.text("", { status: 200 });
  }),

  http.patch("/api/user/avatar", () => {
    return HttpResponse.json({
      success: true,
      avatarUrl: "https://stub-bucket.s3.amazonaws.com/avatar",
    });
  }),
];
