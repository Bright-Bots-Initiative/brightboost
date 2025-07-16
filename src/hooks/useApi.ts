export const useApi = () => {
  const get = async <T = any>(url: string): Promise<{ data: T }> => {
    // Mock API responses that match Aaron's lambda structure
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (url === '/api/profile') {
      return {
        data: {
          id: '1',
          name: 'Test Teacher',
          email: 'teacher@brightboost.com',
          role: 'teacher',
          avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
          avatarUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
          school: 'Bright Boost Academy',
          subject: 'STEM Education',
          created_at: '2025-01-01T00:00:00Z'
        } as T
      };
    }
    
    if (url === '/api/teacher/dashboard') {
      return {
        data: [
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
        ] as T
      };
    }
    
    return { data: {} as T };
  };

  const post = async <T = any>(_url: string, _data: any): Promise<{ data: T }> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { data: { success: true } as T };
  };

  const put = async <T = any>(url: string, data: any): Promise<{ data: T }> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (url === '/api/profile') {
      if (!data.name || typeof data.name !== 'string') {
        throw new Error('Name is required and must be a string');
      }
      
      if (data.name.length > 50) {
        throw new Error('Name must be 50 characters or less');
      }
      
      return { 
        data: { 
          success: true, 
          user: {
            id: '1',
            name: data.name,
            email: 'teacher@brightboost.com',
            school: data.school || null,
            subject: data.subject || null,
            avatarUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
          }
        } as T
      };
    }
    
    return { data: { success: true } as T };
  };

  const delete_ = async <T = any>(_url: string): Promise<{ data: T }> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { data: { success: true } as T };
  };

  return { get, post, put, delete: delete_ };
};
