export interface Lesson {
  id: number | string; // Allow string for dnd-kit compatibility if IDs are not numbers
  title: string;
  category: string;
  date: string;
  status: "Published" | "Draft" | "Review" | string; // Allow other string statuses
  content?: string; // Add content property
}

export interface SortableLessonRowProps {
  lesson: Lesson;
  onEditLesson: (lesson: Lesson) => void; // Changed from onEdit and updated signature
  onDuplicateLesson: (id: Lesson["id"]) => void; // Changed from onDuplicate
  onDeleteLesson: (id: Lesson["id"]) => void; // Changed from onDelete
}
export interface LessonsTableProps {
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onEditLesson: (lesson: Lesson) => void; // Changed from onEdit and updated signature
  onDuplicateLesson: (id: Lesson["id"]) => void; // Changed from onDuplicate
  onDeleteLesson: (id: Lesson["id"]) => void; // Changed from onDelete
}
export interface MainContentProps {
  lessonsData: Lesson[];
  setLessonsData: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onAddLesson: (lesson: Pick<Lesson, "title" | "content" | "category">) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: Lesson["id"]) => void;
}

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

export interface Student {
  id: string;
  name: string;
  email?: string;
}

export interface Class {
  id: string;
  name: string;
  grade?: Grade;
  students: Student[];
}

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

export enum AssignmentStatus {
  Open = "Open",
  Closed = "Closed",
  Draft = "Draft",
}

export type Assignment = {
  id: string;
  title: string;
  dueDate: string; // ISO 8601 string
  status: AssignmentStatus;
};