import { Assignment, AssignmentStatus } from "../components/TeacherDashboard/types";

const mockAssignments: Assignment[] = [
  {
    id: "a1",
    title: "Essay 1",
    dueDate: "2025-07-20",
    status: AssignmentStatus.Open,
  },
  {
    id: "a2",
    title: "Quiz 2",
    dueDate: "2025-07-15",
    status: AssignmentStatus.Closed,
  },
];

export async function getAssignments(classId: string): Promise<Assignment[]> {
  console.log(`Fetching assignments for class ${classId}`);
  return new Promise((resolve) =>
    setTimeout(() => resolve(mockAssignments), 500)
  );
}

export async function createMockAssignment(
  classId: string,
  data: Omit<Assignment, "id">
): Promise<Assignment> {
  const newAssignment: Assignment = {
    ...data,
    id: `a${Date.now()}`,
  };
  return new Promise((resolve) =>
    setTimeout(() => resolve(newAssignment), 500)
  );
}

type MockAssignmentDetail = {
  title: string;
  dueDate: string;
  students: { id: string; name: string }[];
  grades: Record<string, string>;
};

export async function getMockAssignmentDetail(
  classId: string,
  assignmentId: string
): Promise<MockAssignmentDetail> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve({
        title: "Essay 1",
        dueDate: "July 19th, 2025",
        students: [
          { id: "stu-001", name: "Alice" },
          { id: "stu-002", name: "Bob" },
        ],
        grades: {
          "stu-001": "A",
          "stu-002": "B",
        },
      });
    }, 500)
  );
}

export async function patchMockGrades(
  classId: string,
  assignmentId: string,
  grades: Record<string, string> // e.g., { "stu-001": "A", ... }
): Promise<void> {
  console.log("PATCH /api/classes", { classId, assignmentId, grades });
  return new Promise((resolve) => setTimeout(resolve, 300));
}

