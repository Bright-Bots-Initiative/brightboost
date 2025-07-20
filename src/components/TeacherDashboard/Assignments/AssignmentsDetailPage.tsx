import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  patchMockGrades,
  getMockAssignmentDetail,
} from "@/services/assignmentService";
import { Student } from "@/components/TeacherDashboard/types";

const gradeOptions = ["A", "B", "C", "D", "F", "Incomplete"];

const AssignmentDetailPage: React.FC = () => {
  const { id: classId, assignmentId } = useParams<{
    id: string;
    assignmentId: string;
  }>();
  const navigate = useNavigate();
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId || !assignmentId) return;
    getMockAssignmentDetail(classId, assignmentId)
      .then(({ title, dueDate, students, grades }) => {
        setAssignmentTitle(title);
        setDueDate(dueDate);
        setStudents(students);
        setGrades(grades);
      })
      .catch(() => setError("Assignment not found"));
  }, [classId, assignmentId]);

  const handleGradeChange = async (studentId: string, newGrade: string) => {
    const updatedGrades = { ...grades, [studentId]: newGrade };
    setGrades(updatedGrades);
    setIsSaving(true);

    try {
      await patchMockGrades(classId!, assignmentId!, updatedGrades);
    } catch {
      setError("Failed to save grades.");
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="text-gray-700">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-brightboost-navy">
            {assignmentTitle}
          </h1>
          <p className="text-gray-600">Due: {dueDate}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-full transition"
        >
          ← Back to Assignments
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4">Grade Grid</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="text-left border-b text-gray-600">
              <th className="py-2">Student ID</th>
              <th className="py-2">Name</th>
              <th className="py-2">Grade</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.id}
                className="border-b hover:bg-gray-50 transition"
              >
                <td className="py-2">{student.id}</td>
                <td className="py-2">{student.name}</td>
                <td className="py-2">
                  <select
                    value={grades[student.id] || ""}
                    onChange={(e) =>
                      handleGradeChange(student.id, e.target.value)
                    }
                    className="p-1 border rounded"
                  >
                    <option value="">-- Select --</option>
                    {gradeOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isSaving && (
          <p className="text-gray-500 italic mt-2">Saving changes…</p>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetailPage;
