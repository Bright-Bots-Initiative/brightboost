
// src/services/api.ts
import { useAuth } from '../contexts/AuthContext';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_BASE || '';

// Non-authenticated API calls
export const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const signupUser = async (name: string, email: string, password: string, role: string) => {
  try {
    // console.log(`Sending signup request to: ${API_URL}/auth/signup`);
    
    const response = await fetch(`${API_URL}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, role }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Signup error response:', errorText);
      
      let errorMessage = 'Signup failed';
      try {
        // Try to parse as JSON if possible
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If not JSON, use status text
        errorMessage = `Signup failed: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

// Hook for authenticated API calls
export const useApi = () => {
  const { token } = useAuth();
  
  const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  };
  
  return {
    get: (endpoint: string) => authFetch(endpoint),
    post: (endpoint: string, data: Record<string, unknown>) => authFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    put: (endpoint: string, data: Record<string, unknown>) => authFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (endpoint: string) => authFetch(endpoint, {
      method: 'DELETE',
    }),
  };
};
