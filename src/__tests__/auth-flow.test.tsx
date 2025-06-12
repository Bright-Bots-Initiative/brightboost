
export const authTestCases = {
  teacherSignup: {
    description: 'Teacher signup should store token with brightboost_token key',
    steps: [
      'Navigate to /teacher/signup',
      'Fill in name, email, password, confirm password',
      'Click Sign Up button',
      'Verify localStorage contains brightboost_token',
      'Verify redirect to /teacher/dashboard'
    ]
  },
  
  studentSignup: {
    description: 'Student signup should redirect to student dashboard',
    steps: [
      'Navigate to /student/signup', 
      'Fill in name, email, password, confirm password',
      'Click Sign Up button',
      'Verify localStorage contains brightboost_token',
      'Verify redirect to /student/dashboard'
    ]
  },
  
  loginErrorHandling: {
    description: 'Login should handle 401 errors gracefully',
    steps: [
      'Navigate to /teacher/login or /student/login',
      'Enter invalid credentials',
      'Click Login button',
      'Verify error message shows "Invalid email or password"',
      'Verify user stays on login page'
    ]
  },
  
  duplicateEmailError: {
    description: 'Signup should show proper error for duplicate email',
    steps: [
      'Navigate to signup page',
      'Enter existing email address',
      'Click Sign Up button', 
      'Verify error message shows "Email already in use"',
      'Verify user stays on signup page'
    ]
  }
};
