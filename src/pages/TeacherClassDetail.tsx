import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Class, gradeOptions, Assignment } from "../components/TeacherDashboard/types";
import {
  fetchMockClassById,
  patchMockClass,
} from "../services/mockClassService";
import AssignmentTable from "@/components/TeacherDashboard/Assignments/AssignmentsTable";
import { getAssignments } from "@/services/assignmentService";
import ExportGradesButton from "../components/TeacherDashboard/ExportGradesButton";
import { Users, GraduationCap, Zap, Trophy, Target, Clock } from "lucide-react";
import { getSTEM1Summary, STEM1_QUESTS } from "../services/stem1GradeService";

const TeacherClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState<Class | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [editingName, setEditingName] = useState("");
  const [editingGrade, setEditingGrade] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchMockClassById(id)
        .then((cls) => {
          setClassData(cls);
          setEditingName(cls.name);
          setEditingGrade(cls.grade ?? "");
        })
        .catch(() => {
          setClassData(null);
          setError("Class not found");
        });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingAssignments(true);
    getAssignments(id)
      .then(setAssignments)
      .finally(() => setLoadingAssignments(false));
  }, [id]);

  const handleSave = async () => {
    if (!classData) return;
    setIsSaving(true);
    try {
      await patchMockClass(classData.id, {
        name: editingName,
        grade: editingGrade as Class["grade"],
      });

      setClassData({
        ...classData,
        name: editingName,
        grade: editingGrade as Class["grade"],
      });
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToAssignmentDetail = (assignmentId: string) => {
    navigate(`/teacher/classes/${id}/assignments/${assignmentId}`);
  };

  if (error) {
    return (
      <div className="flex justify-center items-start w-full p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">
            404: Class Not Found
          </h2>
          <p className="text-gray-600 mt-2">
            The class you're looking for doesn't exist or was removed.
          </p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return <p className="ml-64 p-6 text-gray-500">Loading class details...</p>;
  }

  const stem1Summary = getSTEM1Summary(classData);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-brightboost-navy flex items-center">
            <Zap className="w-7 h-7 mr-2 text-brightboost-blue" />
            STEM-1 Class Details
          </h2>
          <p className="text-gray-600 mt-1">
            Manage class information and track student progress through core
            quests
          </p>
        </div>
        <ExportGradesButton
          classData={classData}
          teacherName={user?.name}
          variant="primary"
          size="md"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Average XP</p>
              <p className="text-2xl font-bold">{stem1Summary.averageXP}</p>
              <p className="text-blue-100 text-xs">out of 500</p>
            </div>
            <Zap className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Completion Rate</p>
              <p className="text-2xl font-bold">{stem1Summary.averageCompletion}%</p>
              <p className="text-green-100 text-xs">class average</p>
            </div>
            <Target className="w-8 h-8 text-green-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Students Passed</p>
              <p className="text-2xl font-bold">{stem1Summary.studentsPassedSTEM1}</p>
              <p className="text-yellow-100 text-xs">
                of {stem1Summary.totalStudents} students
              </p>
            </div>
            <Trophy className="w-8 h-8 text-yellow-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Last Updated</p>
              <p className="text-lg font-bold">{stem1Summary.lastUpdated}</p>
              <p className="text-purple-100 text-xs">progress sync</p>
            </div>
            <Clock className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Class Info + Quests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-brightboost-navy flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Class Information
          </h3>
          <div className="flex flex-col gap-4 max-w-lg">
            <label className="text-sm font-semibold text-gray-700">
              Class Name:
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="mt-1 p-2 border rounded w-full focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Grade:
              <select
                value={editingGrade}
                onChange={(e) => setEditingGrade(e.target.value)}
                className="mt-1 p-2 border rounded w-full focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue"
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
              className="bg-brightboost-blue text-white px-4 py-2 rounded hover:bg-brightboost-navy transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-brightboost-navy flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            STEM-1 Core Quests
          </h3>
          <div className="space-y-3">
            {STEM1_QUESTS.map((quest) => (
              <div
                key={quest.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    {quest.name}
                  </span>
                  <span className="text-xs font-bold text-brightboost-blue">
                    {quest.maxXP} XP
                  </span>
                </div>
                <p className="text-xs text-gray-600">{quest.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Roster */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-brightboost-navy flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Class Roster ({classData.students.length} students)
          </h3>
          <ExportGradesButton
            classData={classData}
            teacherName={user?.name}
            variant="secondary"
            size="sm"
          />
        </div>
        {classData.students.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-lg text-gray-500 mb-2">No students enrolled</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="text-sm text-gray-600 border-b bg-gray-50">
                  <th className="py-3 px-4 font-medium">Student ID</th>
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">STEM-1 Progress</th>
                  <th className="py-3 px-4 font-medium">XP Earned</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {classData.students.map((student) => {
                  const mockXP = Math.floor(Math.random() * 200) + 300;
                  const mockCompletion = Math.floor((mockXP / 500) * 100);
                  const mockPassed = mockCompletion >= 70;

                  return (
                    <tr
                      key={student.id}
                      className="border-b text-sm text-gray-800 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-mono text-xs">
                        {student.id}
                      </td>
                      <td className="py-3 px-4 font-medium">{student.name}</td>
                      <td className="py-3 px-4">
                        {student.email ?? (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                mockPassed ? "bg-green-500" : "bg-yellow-500"
                              }`}
                              style={{ width: `${mockCompletion}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">
                            {mockCompletion}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">{mockXP}/500</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            mockPassed
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {mockPassed ? "STEM-1 Complete" : "In Progress"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignments */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-brightboost-navy">
            Assignments
          </h3>
          <button
            onClick={() =>
              navigate(`/teacher/classes/${classData.id}/assignments`)
            }
            className="bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm px-3 py-1.5 rounded transition"
          >
            View All
          </button>
        </div>
        {loadingAssignments ? (
          <p className="text-gray-500 italic">Loading assignments…</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No assignments yet.</p>
        ) : (
          <AssignmentTable
            assignments={assignments}
            onRowClick={navigateToAssignmentDetail}
          />
        )}
      </div>
    </div>
  );
};

export default TeacherClassDetail;
