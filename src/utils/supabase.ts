
/**
 * This utility provides a way to conditionally use the Supabase service role
 * only when it's available, with fallbacks for CI environments.
 * 
 * This allows the application to build and deploy in Cloudflare Pages
 * without requiring the service role secret during CI checks.
 */

const DEFAULT_SUPABASE_URL = 'https://ycldhifnaycqmqnxzgxr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Get Supabase configuration with fallbacks for CI environments
 */
export const getSupabaseConfig = () => {
  return {
    supabaseUrl: import.meta.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
    
    supabaseServiceRole: import.meta.env.SUPABASE_SERVICE_ROLE,
    
    isProduction: import.meta.env.PROD === true,
    
    hasServiceRole: Boolean(import.meta.env.SUPABASE_SERVICE_ROLE),
  };
};

/**
 * Use this function for operations that require the service role
 * It will only execute the callback if the service role is available
 * Otherwise, it will return a fallback value or throw an error
 */
export const withServiceRole = <T>(
  callback: (serviceRole: string) => T,
  fallback?: T
): T => {
  const { supabaseServiceRole, hasServiceRole } = getSupabaseConfig();
  
  if (!hasServiceRole) {
    if (fallback !== undefined) {
      console.warn('Service role not available, using fallback');
      return fallback;
    }
    
    if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
      console.warn('Service role required but not available in development mode');
      return {} as T;
    }
    
    throw new Error('Service role is required for this operation but not available');
  }
  
  return callback(supabaseServiceRole);
};

/**
 * Example usage:
 * 
 * // This will only run if the service role is available
 * withServiceRole(
 *   (serviceRole) => {
 *     // Use serviceRole for admin operations
 *     return supabaseAdmin.auth.admin.listUsers();
 *   },
 *   // Fallback for CI environments
 *   { users: [] }
 * );
 */
