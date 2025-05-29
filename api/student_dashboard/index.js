module.exports = async function (context, req) {
  try {
    const mockEnrolledLessons = [
      {
        id: "1",
        title: "Introduction to Algebra",
        category: "Mathematics",
        progress: 75,
        nextLesson: "Solving Linear Equations"
      },
      {
        id: "2",
        title: "Basic Chemistry Concepts",
        category: "Science",
        progress: 50,
        nextLesson: "Periodic Table Elements"
      },
      {
        id: "3",
        title: "World History Overview",
        category: "History",
        progress: 30,
        nextLesson: "Ancient Civilizations"
      }
    ];

    const mockActivities = [
      {
        id: "1",
        title: "Algebra Quiz",
        dueDate: "2025-06-05",
        completed: true,
        score: 85
      },
      {
        id: "2",
        title: "Chemistry Lab Report",
        dueDate: "2025-06-10",
        completed: false,
        score: null
      },
      {
        id: "3",
        title: "History Essay",
        dueDate: "2025-06-15",
        completed: false,
        score: null
      }
    ];

    context.res = {
      headers: { "Content-Type": "application/json" },
      body: {
        studentName: req.query.name || "Student",
        enrolledLessons: mockEnrolledLessons,
        activities: mockActivities
      }
    };
  } catch (error) {
    context.log.error("Error in student dashboard function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        error: "An unexpected error occurred while fetching student dashboard data." 
      }
    };
  }
};
