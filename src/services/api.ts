interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

export const useApi = () => {
  const get = async <T = any>(url: string): Promise<T> => {
    // Mock API responses
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (url === '/api/profile') {
      return {
        id: '1',
        name: 'Test Teacher',
        email: 'teacher@brightboost.com',
        role: 'teacher',
        avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
        school: 'Bright Boost Academy',
        subject: 'STEM Education',
        created_at: '2025-01-01T00:00:00Z'
      } as T;
    }
    
    if (url === '/api/teacher/dashboard') {
      return [
        {
          id: '1',
          name: 'Introduction to Algebra',
          email: 'algebra@brightboost.com',
          createdAt: '2025-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Advanced Geometry',
          email: 'geometry@brightboost.com',
          createdAt: '2025-01-02T00:00:00Z'
        }
      ] as T;
    }
    
    return {} as T;
  };

  const post = async <T = any>(url: string, data: any): Promise<T> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true } as T;
  };

  const put = async <T = any>(url: string, data: any): Promise<T> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (url === '/api/profile') {
      return { 
        success: true, 
        user: {
          id: '1',
          name: data.name,
          email: 'teacher@brightboost.com',
          school: data.school,
          subject: data.subject,
          avatarUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
        }
      } as T;
    }
    
    return { success: true } as T;
  };

  const delete_ = async <T = any>(url: string): Promise<T> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true } as T;
  };

  return { get, post, put, delete: delete_ };
};