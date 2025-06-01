import React from 'react';
import { MainContentProps } from './types';
import LessonsTable from './LessonTable';

const MainContent: React.FC<MainContentProps> = ({
  activeView,
  lessonsData,
  onDeleteLesson,
}) => {
  const openEditForm = () => {
    console.log('Edit lesson (not implemented)');
  };

  const handleDuplicateLesson = (id: string | number) => {
    console.log('Duplicate lesson (not implemented):', id);
  };

  return (
    <div className="flex-grow p-6 ml-64">
      <h2 className="text-2xl font-bold mb-6 text-brightboost-navy">{activeView}</h2>

      {activeView === 'Lessons' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Lessons Management</h3>
          <p className="text-gray-600 mb-4">
            You have {lessonsData.length} lessons available.
          </p>
          <LessonsTable
            lessons={lessonsData}
            setLessons={() => {}}
            onEditLesson={openEditForm}
            onDuplicateLesson={handleDuplicateLesson}
            onDeleteLesson={onDeleteLesson}
          />
        </div>
      )}
      
      {activeView === 'Students' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Student Management</h3>
          <p className="text-gray-600">
            Student management features will be implemented in a future update.
          </p>
        </div>
      )}
      
      {activeView === 'Settings' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Dashboard Settings</h3>
          <p className="text-gray-600">
            Settings and configuration options will be implemented in a future update.
          </p>
        </div>
      )}
    </div>
  );
};

export default MainContent;
