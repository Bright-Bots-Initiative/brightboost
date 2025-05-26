/// <reference types="cypress" />

describe('Core Demo Flow E2E Test', () => {
  const teacher = {
    name: 'E2E Teacher',
    email: `teacher-${Date.now()}@example.com`, // Unique email for each run
    password: 'password123',
    role: 'teacher',
  };

  const student = {
    name: 'E2E Student',
    email: `student-${Date.now()}@example.com`, // Unique email for each run
    password: 'password456',
    role: 'student',
  };

  const createdLessonTitle = `E2E Lesson ${Date.now()}`;
  const lessonCategory = 'E2E Category';
  const lessonContent = 'This is automated E2E test content for a lesson.';

  beforeEach(() => {
    // Potentially clear localStorage before each specific test action that needs a clean slate,
    // or handle login/logout explicitly within tests or describe blocks.
    // For this flow, we will handle login/logout explicitly.
    cy.visit('/'); // Start at the home page
  });

  context('Teacher Flow', () => {
    it('should allow a new teacher to sign up and auto-login', () => {
      cy.log('Starting teacher signup...');
      cy.contains('Sign Up').click(); // Assuming a general signup button on home
      cy.url().should('include', '/signup');
      cy.contains('Teacher Signup').click(); // On SignupSelection page
      cy.url().should('include', '/teacher/signup');

      cy.get('input#name').type(teacher.name);
      cy.get('input#email').type(teacher.email);
      cy.get('input#password').type(teacher.password);
      cy.get('input#confirmPassword').type(teacher.password);
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/teacher/dashboard', { timeout: 10000 });
      cy.window().its('localStorage.token').should('exist');
      cy.window().its('localStorage.user').should('exist');
      cy.log('Teacher signup and auto-login successful.');
    });

    it('should allow an existing teacher to login', () => {
      // This test assumes the teacher from the previous signup exists
      // Or, ideally, this would use a pre-existing seeded teacher.
      // For now, it relies on the previous test creating the teacher.
      // If running independently, this might need its own signup or a direct API login.
      cy.log(`Starting teacher login for: ${teacher.email}`);
      cy.contains('Login').click(); // Assuming a general login button on home
      cy.url().should('include', '/login');
      cy.contains('Teacher Login').click(); // On LoginSelection page
      cy.url().should('include', '/teacher/login');

      cy.get('input#email').type(teacher.email);
      cy.get('input#password').type(teacher.password);
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/teacher/dashboard', { timeout: 10000 });
      cy.window().its('localStorage.token').should('exist');
      cy.window().its('localStorage.user').should('exist');
      cy.log('Teacher login successful.');
    });

    it('should allow a logged-in teacher to create a new lesson', () => {
      // Login first (could be a custom command)
      cy.log(`Teacher login for lesson creation: ${teacher.email}`);
      cy.visit('/teacher/login'); // Direct navigation for simplicity here
      cy.get('input#email').type(teacher.email);
      cy.get('input#password').type(teacher.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/teacher/dashboard', { timeout: 10000 });
      cy.log('Teacher logged in for lesson creation.');

      cy.contains('Lessons').click(); // Navigate to lessons section if not default
      
      cy.contains('Add New Lesson').click();
      
      cy.get('input#lessonTitle').type(createdLessonTitle);
      cy.get('textarea#lessonContent').type(lessonContent);
      cy.get('input#lessonCategory').type(lessonCategory);
      // Assuming 'Status' defaults or is handled; if a select, use cy.get('select#status').select('Published');
      // For now, assuming the form works with these fields and backend defaults status/date
      cy.contains('button', 'Create Lesson').click(); // Or 'Save Changes' if it's a generic button

      cy.log('Lesson creation form submitted.');
      // Verify lesson appears in the table
      cy.contains('td', createdLessonTitle).should('be.visible');
      cy.contains('td', lessonContent.substring(0,50)).should('be.visible'); // Check for summary
      cy.contains('td', lessonCategory).should('be.visible');
      cy.log('Lesson successfully created and visible in dashboard.');
    });

    it('should allow a teacher to logout', () => {
      // Login first
      cy.log(`Teacher login for logout test: ${teacher.email}`);
      cy.visit('/teacher/login');
      cy.get('input#email').type(teacher.email);
      cy.get('input#password').type(teacher.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/teacher/dashboard', { timeout: 10000 });
      cy.log('Teacher logged in for logout test.');

      cy.contains('Logout').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/'); // Should redirect to home
      cy.window().its('localStorage.token').should('not.exist');
      cy.window().its('localStorage.user').should('not.exist');
      cy.log('Teacher logout successful.');
    });
  });

  context('Student Flow', () => {
    it('should allow a new student to sign up and auto-login', () => {
      cy.log('Starting student signup...');
      cy.contains('Sign Up').click();
      cy.url().should('include', '/signup');
      cy.contains('Student Signup').click(); // On SignupSelection page
      cy.url().should('include', '/student/signup');

      cy.get('input#name').type(student.name);
      cy.get('input#email').type(student.email);
      cy.get('input#password').type(student.password);
      cy.get('input#confirmPassword').type(student.password);
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/student/dashboard', { timeout: 10000 });
      cy.window().its('localStorage.token').should('exist');
      cy.window().its('localStorage.user').should('exist');
      cy.log('Student signup and auto-login successful.');
    });

    it('should allow an existing student to login', () => {
      cy.log(`Starting student login for: ${student.email}`);
      cy.contains('Login').click();
      cy.url().should('include', '/login');
      cy.contains('Student Login').click(); // On LoginSelection page
      cy.url().should('include', '/student/login');

      cy.get('input#email').type(student.email);
      cy.get('input#password').type(student.password);
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/student/dashboard', { timeout: 10000 });
      cy.window().its('localStorage.token').should('exist');
      cy.window().its('localStorage.user').should('exist');
      cy.log('Student login successful.');
    });

    it('should allow a student to view the lesson created by the teacher and mark an activity complete', () => {
      // Login first
      cy.log(`Student login for lesson viewing: ${student.email}`);
      cy.visit('/student/login');
      cy.get('input#email').type(student.email);
      cy.get('input#password').type(student.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/student/dashboard', { timeout: 10000 });
      cy.log('Student logged in for lesson viewing.');

      // View the lesson
      cy.contains('h4', createdLessonTitle).should('be.visible'); // Lesson title in a card
      // Assuming the lesson content snippet is also visible directly or after clicking the card.
      // For this test, let's assume it's visible on the card.
      cy.contains(lessonContent.substring(0, 50)).should('be.visible'); 
      cy.log('Lesson created by teacher is visible to student.');

      // Mark an activity as complete
      // This assumes the activity name is related to the lesson title or is identifiable.
      // The backend creates default activities for lessons if studentActivities are empty.
      // Let's assume an activity related to 'createdLessonTitle' exists.
      // The current student dashboard shows activities like:
      // <h4 class="font-bold text-lg">{activity.lessonTitle || `Activity for Lesson ${activity.lessonId}`}</h4>
      // And a button: Mark as Complete
      // We need to find the activity associated with `createdLessonTitle`.
      // This requires knowing how activities are linked and displayed.
      // The backend /api/student/dashboard returns 'activities' which are studentActivities from the database,
      // and these are enriched with 'lessonTitle'.
      // The 'createdLessonTitle' is the title of a lesson.
      // An activity will have a 'lessonTitle' that matches 'createdLessonTitle'.
      
      // Find the card/div containing the activity by its title, then find the button within it.
      cy.contains('div', createdLessonTitle) // Find a container related to the lesson/activity
        .parents('.p-4.rounded-lg.shadow') // Go up to the card container for the activity
        .within(() => {
          cy.contains('button', 'Mark as Complete').click();
          cy.contains('p', 'Completed!').should('be.visible'); // Verify UI update
        });
      cy.log('Student marked activity as complete.');
    });

    it('should allow a student to logout', () => {
      // Login first
      cy.log(`Student login for logout test: ${student.email}`);
      cy.visit('/student/login');
      cy.get('input#email').type(student.email);
      cy.get('input#password').type(student.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/student/dashboard', { timeout: 10000 });
      cy.log('Student logged in for logout test.');

      cy.contains('Logout').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/'); // Should redirect to home
      cy.window().its('localStorage.token').should('not.exist');
      cy.window().its('localStorage.user').should('not.exist');
      cy.log('Student logout successful.');
    });
  });
});
