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
    <div className="flex-grow p-6 ml-64">
      <h2 className="text-2xl font-bold mb-6 text-brightboost-navy">
        Lessons
      </h2>


        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Lessons Management</h3>
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
        </div>
    </div>
  );
};

export default MainContent;
