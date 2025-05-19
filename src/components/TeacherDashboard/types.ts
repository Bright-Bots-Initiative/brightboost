<<<<<<< HEAD

export interface Lesson {
  id: number | string; // Allow string for dnd-kit compatibility if IDs are not numbers
  title: string;
  category: string;
  date: string;
  status: "Published" | "Draft" | "Review" | string; // Allow other string statuses
}


export interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export interface SortableLessonRowProps {
  lesson: Lesson;
  onEdit: (id: Lesson['id']) => void;
  onDuplicate: (id: Lesson['id']) => void;
  onDelete: (id: Lesson['id']) => void;
}

export interface LessonsTableProps {
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onEdit: (id: Lesson['id']) => void;
  onDuplicate: (id: Lesson['id']) => void;
  onDelete: (id: Lesson['id']) => void;
}

export interface MainContentProps {
  activeView: string;
  lessonsData: Lesson[];
  setLessonsData: React.Dispatch<React.SetStateAction<Lesson[]>>;
}
||||||| 1e5261c
=======
export interface Lesson {
  id: number | string; // Allow string for dnd-kit compatibility if IDs are not numbers
  title: string;
  category: string;
  date: string;
  status: "Published" | "Draft" | "Review" | string; // Allow other string statuses
}

export interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export interface SortableLessonRowProps {
  lesson: Lesson;
  onEdit: (id: Lesson['id']) => void;
  onDuplicate: (id: Lesson['id']) => void;
  onDelete: (id: Lesson['id']) => void;
}

export interface LessonsTableProps {
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onEdit: (id: Lesson['id']) => void;
  onDuplicate: (id: Lesson['id']) => void;
  onDelete: (id: Lesson['id']) => void;
}

export interface MainContentProps {
  activeView: string;
  lessonsData: Lesson[];
  setLessonsData: React.Dispatch<React.SetStateAction<Lesson[]>>;
}
>>>>>>> main
