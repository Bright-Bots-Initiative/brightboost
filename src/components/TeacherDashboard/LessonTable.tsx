import React from 'react';
import { LessonsTableProps, Lesson } from './types';

const LessonsTable: React.FC<LessonsTableProps> = ({ lessons, onEditLesson, onDuplicateLesson, onDeleteLesson }) => {
  if (!lessons || lessons.length === 0) {
    return <p className="text-gray-600 p-4">No lessons available.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
      <table className="min-w-full table-auto">
        <thead className="bg-gray-100 border-b-2 border-gray-200">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content (Summary)</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {lessons.map((lesson: Lesson) => (
            <tr key={lesson.id} className="hover:bg-gray-50 transition duration-150">
              <td className="py-4 px-4 text-sm font-medium text-gray-900 whitespace-nowrap align-middle">{lesson.title}</td>
              <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap align-middle max-w-xs truncate" title={lesson.content}>
                {lesson.content ? `${lesson.content.substring(0, 50)}...` : 'N/A'}
              </td>
              <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap align-middle">{lesson.category}</td>
              <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap align-middle">{lesson.date}</td>
              <td className="py-4 px-6 text-sm whitespace-nowrap align-middle">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  lesson.status === "Published" ? "bg-green-100 text-green-800" :
                  lesson.status === "Draft" ? "bg-yellow-100 text-yellow-800" :
                  "bg-blue-100 text-blue-800"
                }`}>
                  {lesson.status}
                </span>
              </td>
              <td className="py-4 px-6 text-sm font-medium whitespace-nowrap align-middle">
                <div className="flex items-center space-x-2">
                  <button onClick={() => onEditLesson(lesson)} className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button onClick={() => onDuplicateLesson(lesson.id)} className="text-green-600 hover:text-green-900">
                    Duplicate
                  </button>
                  <button onClick={() => onDeleteLesson(lesson.id)} className="text-red-600 hover:text-red-900">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LessonsTable;
