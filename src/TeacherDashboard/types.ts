// src/components/TeacherDashboard/types.ts

// src/components/TeacherDashboard/types.ts

// Defines the structure for a Lesson object
export interface Lesson {
  id: number | string; // Allow string for dnd-kit compatibility if IDs are not numbers
  title: string;
  content?: string; // Added content field as it's in backend for create/edit
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
  // Pass the full edit handler to allow row to trigger edit mode or open modal
  onEditLesson: (lesson: Lesson) => void;
  onDuplicateLesson: (id: Lesson["id"]) => void;
  onDeleteLesson: (id: Lesson["id"]) => void;
}

// Props for the LessonsTable component
export interface LessonsTableProps {
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>; // For local manipulations like drag-and-drop
  onEditLesson: (lesson: Lesson) => void; // To initiate edit for a lesson
  onDuplicateLesson: (id: Lesson["id"]) => void;
  onDeleteLesson: (id: Lesson["id"]) => void;
}

// Props for the MainContent component
export interface MainContentProps {
  activeView: string;
  lessonsData: Lesson[];
  setLessonsData: React.Dispatch<React.SetStateAction<Lesson[]>>; // For local manipulations
  onAddLesson: (
    newLesson: Omit<Lesson, "id" | "status" | "date"> &
      Partial<Pick<Lesson, "status" | "date">>,
  ) => void;
  onEditLesson: (lessonToEdit: Lesson) => void; // Changed to pass the full lesson to pre-fill form
  onDeleteLesson: (id: Lesson["id"]) => void;
}
