
/**
 * Get environment variables with fallbacks for CI environments
 * This allows the application to run in CI without requiring all production secrets
 */
export const getEnvConfig = () => {
  return {
    supabaseUrl: import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycldhifnaycqmqnxzgxr.supabase.co',
    supabaseAnonKey: import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    
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
  const { supabaseServiceRole, hasServiceRole } = getEnvConfig();
  
  if (!hasServiceRole) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error('Service role is required for this operation but not available');
  }
  
  return callback(supabaseServiceRole);
};
