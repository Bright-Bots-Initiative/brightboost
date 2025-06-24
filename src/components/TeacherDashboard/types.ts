export interface Lesson {
  id: number | string; // Allow string for dnd-kit compatibility if IDs are not numbers
  title: string;
  category: string;
  date: string;
  status: "Published" | "Draft" | "Review" | string; // Allow other string statuses
  content?: string; // Add content property
}

export interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
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
  activeView: string;
  lessonsData: Lesson[];
  setLessonsData: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onAddLesson: (lesson: Pick<Lesson, "title" | "content" | "category">) => void; // Add this prop
  onEditLesson: (lesson: Lesson) => void; // Add this prop
  onDeleteLesson: (id: Lesson["id"]) => void; // Add this prop
}
