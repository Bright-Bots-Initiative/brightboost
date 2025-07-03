import { Class } from "../components/TeacherDashboard/types";

// Source of truth for all mock class data
const mockClasses: Class[] = [
  {
    id: "class-001",
    name: "Quantum Basics",
    grade: "3rd",
    students: [
      { id: "stu-001", name: "Alice", email: "alice@example.com" },
      { id: "stu-002", name: "Bob", email: "bob@example.com" },
    ],
  },
  {
    id: "class-002",
    name: "AI Writing",
    grade: "4th",
    students: [],
  },
];

// Outputs entire list (used by TeacherClasses.tsx)
export const fetchMockClasses = async (): Promise<Class[]> => {
  await new Promise((res) => setTimeout(res, 500));
  return mockClasses.map((cls) => ({
    ...cls,
    students: [...cls.students],
  }));
};

// Outputs one class by ID (used by TeacherClassDetail.tsx)
export const fetchMockClassById = async (id: string): Promise<Class> => {
  await new Promise((res) => setTimeout(res, 300));
  const cls = mockClasses.find((c) => c.id === id);
  if (!cls) throw new Error("Class not found");
  return { ...cls };
};

// Update class name and/or grade (used by TeacherClassDetail.tsx)
export const patchMockClass = async (
  id: string,
  updates: Partial<Pick<Class, "name" | "grade">>
): Promise<Class> => {
  await new Promise((res) => setTimeout(res, 300));
  const index = mockClasses.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Class not found");
  mockClasses[index] = { ...mockClasses[index], ...updates };
  return { ...mockClasses[index] };
};

// Bulk import class from CSV (new function for CSV import)
export const bulkImportClass = async (
  classData: Omit<Class, 'id'>
): Promise<Class> => {
  await new Promise((res) => setTimeout(res, 1000)); // Simulate API delay
  
  const newClass: Class = {
    id: `class-${Date.now()}`,
    ...classData
  };
  
  mockClasses.push(newClass);
  return { ...newClass };
};