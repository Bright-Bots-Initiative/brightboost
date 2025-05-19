import React from 'react';
import { MainContentProps } from './types';

const MainContent: React.FC<MainContentProps> = ({ activeView, lessonsData, setLessonsData }) => {
  return (
    <div className="flex-grow p-6 ml-64">
      <h2 className="text-2xl font-bold mb-6 text-brightboost-navy">{activeView}</h2>
      
      {activeView === 'Lessons' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Lessons Management</h3>
          <p className="text-gray-600 mb-4">
            You have {lessonsData.length} lessons available.
          </p>
          <div className="space-y-4">
            {lessonsData.map(lesson => (
              <div key={lesson.id} className="border p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <h4 className="font-medium">{lesson.title}</h4>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Category: {lesson.category}</span>
                  <span>Date: {lesson.date}</span>
                  <span className={`px-2 py-1 rounded-full text-white ${
                    lesson.status === 'Published' ? 'bg-green-500' : 
                    lesson.status === 'Draft' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {lesson.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
