import React from "react";
import { MainContentProps, Lesson } from "./types";
import LessonsTable from "./LessonTable";

const MainContent: React.FC<MainContentProps> = ({
  lessonsData,
  setLessonsData,
  onAddLesson: _onAddLesson,
  onEditLesson,
  onDeleteLesson,
}) => {
  const openEditForm = (lesson: Lesson) => {
    onEditLesson(lesson);
  };

  const handleDuplicateLesson = (id: string | number) => {
    console.log("Duplicate lesson (not implemented):", id);
  };

  return (
    <main className="flex-grow p-6" role="main">
      <header>
        <h1 className="text-2xl font-bold mb-6 text-brightboost-navy">
          Lessons
        </h1>
      </header>

      <section
        className="bg-white rounded-lg shadow-md p-6"
        aria-labelledby="lessons-management-heading"
      >
        <h2
          id="lessons-management-heading"
          className="text-xl font-semibold mb-4"
        >
          Lessons Management
        </h2>
        <p className="text-gray-600 mb-4">
          You have {lessonsData.length} lessons available.
        </p>
        <LessonsTable
          lessons={lessonsData}
          setLessons={setLessonsData}
          onEditLesson={openEditForm}
          onDuplicateLesson={handleDuplicateLesson}
          onDeleteLesson={onDeleteLesson}
        />
      </section>
    </main>
  );
};

export default MainContent;
