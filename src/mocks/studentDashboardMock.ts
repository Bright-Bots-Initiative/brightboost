export const studentDashboardMock = {
  message: "Welcome back!",
  xp: 150,
  level: 2,
  nextLevelXp: 200,
  currentModule: {
    title: "Hello World!",
    status: "In Progress",
    dueDate: "07-01-2025",
    lessonId: "lesson_1",
  },
  nextModule: {
    title: "Intro to Python",
    status: "Not Started",
    dueDate: "07-01-2025",
    lessonId: "lesson_1",
  },
  courses: [
    { id: "c1", name: "Math 101", grade: "5", teacher: "Mr. Newton" },
    { id: "c2", name: "Science 202", grade: "5", teacher: "Ms. Curie" },
  ],
  assignments: [
    {
      id: "a1",
      title: "Math Worksheet",
      dueDate: "06-30-2025",
      status: "pending" as const,
    },
    {
      id: "a2",
      title: "Science Quiz",
      dueDate: "07-02-2025",
      status: "completed" as const,
    },
  ],
};
