// src/components/TeacherDashboard/types.ts
export interface Lesson {
  id: number | string;
  title: string;
  content: string;
  category: string;
  date: string;
  status: "Published" | "Draft" | "Review" | string;
}

export interface SortableLessonRowProps {
  lesson: Lesson;
  onEditLesson: (lesson: Lesson) => void;
  onDuplicateLesson: (id: Lesson["id"]) => void;
  onDeleteLesson: (id: Lesson["id"]) => void;
}

export interface LessonsTableProps {
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onEditLesson: (lesson: Lesson) => void;
  onDuplicateLesson: (id: Lesson["id"]) => void;
  onDeleteLesson: (id: Lesson["id"]) => void;
}

export interface MainContentProps {
  lessonsData: Lesson[];
  setLessonsData: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onAddLesson: (lesson: Pick<Lesson, "title" | "content" | "category">) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: Lesson["id"]) => void;
}

export type Student = {
  id: string;
  name: string;
  email?: string;
};

export type Class = {
  id: string;
  name: string;
  grade?: Grade;
  students: Student[];
};

export type Grade =
  | "Kindergarten"
  | "1st"
  | "2nd"
  | "3rd"
  | "4th"
  | "5th"
  | "6th"
  | "7th"
  | "8th"
  | "9th"
  | "10th"
  | "11th"
  | "12th";

export const gradeOptions: Grade[] = [
  "Kindergarten",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];

export type CSVRow = Record<string, string> & {
  className: string;
  studentName: string;
  studentEmail: string;
  studentId?: string;
  grade?: string;
};

export interface ParseError {
  line: number;
  message: string;
}

export interface ParsedClassData {
  className: string;
  grade?: string;
  students: Student[];
}