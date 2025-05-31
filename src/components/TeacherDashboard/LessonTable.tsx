// src/components/TeacherDashboard/LessonTable.tsx

import { Lesson } from '../../types/Lesson';

const LessonTable: React.FC<{ lessons: Lesson[] }> = ({ lessons }) => (
  <div className="overflow-x-auto bg-white shadow rounded-lg">
    <table className="min-w-full divide-y divide-gray-200 text-left">
      <thead className="bg-blue-50">
        <tr>
          <th className="px-4 py-2">Title</th>
          <th className="px-4 py-2">Date</th>
          <th className="px-4 py-2">Students</th>
          <th className="px-4 py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {lessons.map((lesson) => (
          <tr key={lesson.id} className="hover:bg-blue-50">
            <td className="px-4 py-2">{lesson.title || '--'}</td>
            <td className="px-4 py-2">{lesson.date || '--'}</td>
            <td className="px-4 py-2">{lesson.studentCount ?? '--'}</td>
            <td className="px-4 py-2">{lesson.status || '--'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default LessonTable;
