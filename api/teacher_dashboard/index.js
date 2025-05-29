module.exports = async function (context, req) {
  try {
    const mockLessons = [
      {
        id: "1",
        title: "Introduction to Algebra",
        category: "Mathematics",
        date: "2025-06-01",
        status: "published"
      },
      {
        id: "2",
        title: "Basic Chemistry Concepts",
        category: "Science",
        date: "2025-06-03",
        status: "draft"
      },
      {
        id: "3",
        title: "World History Overview",
        category: "History",
        date: "2025-06-05",
        status: "published"
      }
    ];

    const mockStudents = [
      {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        progress: 75
      },
      {
        id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        progress: 92
      },
      {
        id: "3",
        name: "Alex Johnson",
        email: "alex@example.com",
        progress: 45
      }
    ];

    context.res = {
      headers: { "Content-Type": "application/json" },
      body: {
        lessons: mockLessons,
        students: mockStudents
      }
    };
  } catch (error) {
    context.log.error("Error in teacher dashboard function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        error: "An unexpected error occurred while fetching dashboard data." 
      }
    };
  }
};
