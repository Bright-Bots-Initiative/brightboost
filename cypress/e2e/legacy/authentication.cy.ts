describe("Authentication Flows", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe("Teacher Signup", () => {
    beforeEach(() => {
      cy.intercept("POST", "**/api/signup/teacher", {
        fixture: "teacher_signup_success.json",
      }).as("teacherSignup");
      cy.visit("/teacher/signup");
    });

    it("successfully signs up a teacher and redirects to dashboard", () => {
      cy.get('input[type="text"]').type("John Teacher");
      cy.get('input[type="email"]').type("john.teacher@example.com");
      cy.get('input[type="password"]').first().type("password123");
      cy.get('input[type="password"]').last().type("password123");

      cy.get('button[type="submit"]').click();

      cy.wait("@teacherSignup");

      cy.url().should("include", "/teacher/dashboard");
      cy.contains("Teacher Dashboard").should("be.visible");
    });

    it("shows error for password mismatch", () => {
      cy.get('input[type="text"]').type("John Teacher");
      cy.get('input[type="email"]').type("john.teacher@example.com");
      cy.get('input[type="password"]').first().type("password123");
      cy.get('input[type="password"]').last().type("differentpassword");

      cy.get('button[type="submit"]').click();

      cy.contains("Passwords do not match").should("be.visible");
      cy.url().should("include", "/teacher/signup");
    });

    it("handles duplicate email error", () => {
      cy.intercept("POST", "**/api/signup/teacher", {
        statusCode: 409,
        body: { error: "User with this email already exists" },
      }).as("teacherSignupError");

      cy.get('input[type="text"]').type("John Teacher");
      cy.get('input[type="email"]').type("existing@example.com");
      cy.get('input[type="password"]').first().type("password123");
      cy.get('input[type="password"]').last().type("password123");

      cy.get('button[type="submit"]').click();
      cy.wait("@teacherSignupError");

      cy.contains("User with this email already exists").should("be.visible");
    });
  });

  it("sends an old student signup link to class sign-in", () => {
    cy.visit("/student/signup");
    cy.location("pathname").should("eq", "/class-login");
    cy.get('input[type="email"]').should("not.exist");
  });

  describe("Login", () => {
    it("successfully logs in a teacher and redirects to teacher dashboard", () => {
      cy.intercept("POST", "**/api/login", {
        fixture: "teacher_login_success.json",
      }).as("teacherLogin");

      cy.visit("/teacher/login");
      cy.get('input[type="email"]').type("teacher@example.com");
      cy.get('input[type="password"]').type("password123");
      cy.get('button[type="submit"]').click();

      cy.wait("@teacherLogin");
      cy.url().should("include", "/teacher/dashboard");
    });

    it("successfully logs in a student and redirects to student dashboard", () => {
      cy.intercept("POST", "**/api/login", {
        fixture: "student_login_success.json",
      }).as("studentLogin");

      cy.visit("/student/login");
      cy.get('input[type="email"]').type("student@example.com");
      cy.get('input[type="password"]').type("password123");
      cy.get('button[type="submit"]').click();

      cy.wait("@studentLogin");
      cy.url().should("include", "/student/dashboard");
    });

    it("shows error for invalid credentials", () => {
      cy.intercept("POST", "**/api/login", {
        statusCode: 401,
        body: { error: "Invalid email or password" },
      }).as("loginError");

      cy.visit("/teacher/login");
      cy.get('input[type="email"]').type("wrong@example.com");
      cy.get('input[type="password"]').type("wrongpassword");
      cy.get('button[type="submit"]').click();

      cy.wait("@loginError");
      cy.contains("Invalid email or password").should("be.visible");
      cy.url().should("include", "/teacher/login");
    });
  });

  describe("Protected Routes", () => {
    it("redirects unauthenticated users to login", () => {
      cy.visit("/teacher/dashboard");
      cy.url().should("include", "/teacher/login");

      cy.visit("/student/dashboard");
      cy.url().should("include", "/student/login");
    });

    it("allows authenticated users to access their dashboard", () => {
      const teacherToken = "mock-teacher-token";
      const teacherUser = {
        id: 1,
        name: "Teacher",
        email: "teacher@example.com",
        role: "TEACHER",
      };

      cy.window().then((win) => {
        win.localStorage.setItem("brightboost_token", teacherToken);
        win.localStorage.setItem("user", JSON.stringify(teacherUser));
      });

      cy.visit("/teacher/dashboard");
      cy.url().should("include", "/teacher/dashboard");
      cy.contains("Teacher Dashboard").should("be.visible");
    });
  });
});
