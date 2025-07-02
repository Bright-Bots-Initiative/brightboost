import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Class, gradeOptions } from "../components/TeacherDashboard/types";
import { fetchMockClassById, patchMockClass } from "../services/mockClassService";

const TeacherClassDetail: React.FC = () => {
  const { id } = useParams();
  const [classData, setClassData] = useState<Class | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingGrade, setEditingGrade] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMockClassById(id).then((cls) => {
        setClassData(cls);
        setEditingName(cls.name);
        setEditingGrade(cls.grade ?? "");
      });
    }
  }, [id]);

  const handleSave = async () => {
    if (!classData) return;
    setIsSaving(true);
    setClassData({ ...classData, name: editingName, grade: editingGrade as Class["grade"]});
    await patchMockClass(classData.id, {
      name: editingName,
      grade: editingGrade as Class["grade"],
    });
    setIsSaving(false);
  };

  if (!classData) {
    return <p className="ml-64 p-6 text-gray-500">Loading class details...</p>;
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6 text-brightboost-navy">
        Class Details
      </h2>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col gap-4 max-w-lg">
          <label className="text-sm font-semibold text-gray-700">
            Class Name:
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="mt-1 p-2 border rounded w-full"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Grade:
            <select
              value={editingGrade}
              onChange={(e) => setEditingGrade(e.target.value)}
              className="mt-1 p-2 border rounded w-full"
            >
            <option value="">Select grade</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-brightboost-navy">
          Class Roster
        </h3>
        {classData.students.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No students enrolled.</p>
        ) : (
          <table className="w-full text-left table-auto mt-2">
            <thead>
              <tr className="text-sm text-gray-600 border-b">
                <th className="py-2">Student ID</th>
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {classData.students.map((student) => (
                <tr key={student.id} className="border-b text-sm text-gray-800">
                  <td className="py-2">{student.id}</td>
                  <td className="py-2">{student.name}</td>
                  <td className="py-2">
                    {student.email ?? <span className="text-gray-400 italic">N/A</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeacherClassDetail;
