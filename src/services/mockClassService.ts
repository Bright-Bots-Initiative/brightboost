import { Class } from "../components/TeacherDashboard/types";

export const fetchMockClasses = async (): Promise<Class[]> => {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve([
        {
          id: "class-001",
          name: "Quantum Basics",
          students: [
            { id: "stu-001", name: "Alice" },
            { id: "stu-002", name: "Bob" },
          ],
        },
        {
          id: "class-002",
          name: "AI Writing",
          students: [],
        },
      ]);
    }, 1000),
  );
};
