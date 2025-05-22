import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000';

const mockLessons = [
  { id: '1', title: 'Introduction to Algebra', category: 'Math', date: '2025-05-01', status: 'Published', content: 'Algebra lesson content' },
  { id: '2', title: 'Advanced Geometry', category: 'Math', date: '2025-05-10', status: 'Draft', content: 'Geometry lesson content' },
  { id: '3', title: 'Chemistry Basics', category: 'Science', date: '2025-05-15', status: 'Review', content: 'Chemistry lesson content' }
];

export const handlers = [
  http.get(`${API_URL}/api/teacher/dashboard`, () => {
    return HttpResponse.json({
      lessons: mockLessons
    });
  }),
  
  http.post(`${API_URL}/auth/login`, () => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: { id: '1', name: 'Test Teacher', email: 'teacher@example.com', role: 'teacher' }
    });
  }),
  
  http.post(`${API_URL}/auth/signup`, () => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: { id: '1', name: 'Test Teacher', email: 'teacher@example.com', role: 'teacher' }
    });
  }),
  
  http.post(`${API_URL}/api/lessons`, async ({ request }) => {
    const requestBody = await request.json() as Record<string, any>;
    const newLesson = {
      id: '4',
      ...requestBody,
      date: new Date().toISOString().split('T')[0],
      status: requestBody.status || 'Draft'
    };
    
    return HttpResponse.json(newLesson, { status: 201 });
  }),
  
  http.put(`${API_URL}/api/lessons/:id`, async ({ params, request }) => {
    const requestBody = await request.json() as Record<string, any>;
    return HttpResponse.json({
      id: params.id,
      ...requestBody
    });
  }),
  
  http.delete(`${API_URL}/api/lessons/:id`, () => {
    return HttpResponse.json({ success: true });
  })
];
