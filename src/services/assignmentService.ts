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