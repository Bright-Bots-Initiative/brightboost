// src/components/TeacherDashboard/types.ts

// Defines the structure for a Lesson object
export interface Lesson {
  id: number | string; // Allow string for dnd-kit compatibility if IDs are not numbers
  title: string;
  category: string;
  date: string;
  status: "Published" | "Draft" | "Review" | string; // Allow other string statuses
}

// Props for individual icon buttons if they were more generic
// For now, specific icons are used directly.
// export interface IconButtonProps {
//   onClick: () => void;
//   title: string;
//   children: React.ReactNode;
//   className?: string;
// }

// Props for the Sidebar component
export interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

// Props for the SortableLessonRow component
export interface SortableLessonRowProps {
  lesson: Lesson;
  onEdit: (id: Lesson['id']) => void;
  onDuplicate: (id: Lesson['id']) => void;
  onDelete: (id: Lesson['id']) => void;
}

// Props for the LessonsTable component
export interface LessonsTableProps {
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onEdit: (id: Lesson['id']) => void;
  onDuplicate: (id: Lesson['id']) => void;
  onDelete: (id: Lesson['id']) => void;
}

// Props for the MainContent component
export interface MainContentProps {
  activeView: string;
  lessonsData: Lesson[];
  setLessonsData: React.Dispatch<React.SetStateAction<Lesson[]>>;
}
