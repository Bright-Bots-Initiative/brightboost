import React, { useEffect, useState } from "react";
import { Class } from "../components/TeacherDashboard/types";
import { fetchMockClasses } from "../services/mockClassService";
import BrightBoostRobot from "../components/BrightBoostRobot";
import CSVImportModal from "../components/TeacherDashboard/CSVImportModal";
import { Upload, Plus, Zap, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import ExportGradesButton from "../components/TeacherDashboard/ExportGradesButton";
import { useAuth } from "../contexts/AuthContext";
import { getSTEM1Summary } from "../services/stem1GradeService";

const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      setIsLoading(true);
      const result = await fetchMockClasses();
      setClasses(result);
      setIsLoading(false);
    };
    loadClasses();
  }, []);

  return (
    <div className="w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-brightboost-navy flex items-center">
            <Zap className="w-7 h-7 mr-2 text-brightboost-blue" />
            STEM-1 Classes
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your K-2 STEM classes and track student progress through core
            quests
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import from CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="h-6 bg-gray-300 animate-pulse w-1/3 mb-4 rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((_, idx) => (
              <div
                key={idx}
                className="h-5 bg-gray-200 animate-pulse rounded"
              ></div>
            ))}
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <BrightBoostRobot size="lg" />
          <p className="text-xl text-brightboost-navy mt-4">
            No STEM-1 classes found.
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Import your first class to start tracking student progress
          </p>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Class from CSV
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {classes.map((cls) => {
            const stem1Summary = getSTEM1Summary(cls);
            return (
              <div
                key={cls.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 hover:border-brightboost-light"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <Link
                      to={`/teacher/classes/${cls.id}`}
                      className="text-lg font-semibold text-brightboost-navy hover:text-brightboost-blue transition-colors flex items-center"
                    >
                      <Zap className="w-5 h-5 mr-2 text-brightboost-blue" />
                      {cls.name}
                    </Link>
                    <div className="flex items-center space-x-6 mt-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        Grade: {cls.grade ?? "N/A"}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {cls.students.length} students
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {stem1Summary.studentsPassedSTEM1}/
                        {stem1Summary.totalStudents} passed STEM-1
                      </div>
                      <p className="text-sm text-gray-400 font-mono">
                        ID: {cls.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ExportGradesButton
                      classData={cls}
                      teacherName={user?.name}
                      variant="secondary"
                      size="sm"
                    />
                    <Link
                      to={`/teacher/classes/${cls.id}`}
                      className="flex items-center px-3 py-1.5 text-sm bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors hover:shadow-md"
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                {/* STEM-1 Progress Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brightboost-blue">
                      {stem1Summary.averageXP}
                    </div>
                    <div className="text-xs text-gray-600">Avg XP / 500</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brightboost-green">
                      {stem1Summary.averageCompletion}%
                    </div>
                    <div className="text-xs text-gray-600">Avg Completion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brightboost-yellow">
                      {stem1Summary.studentsPassedSTEM1}
                    </div>
                    <div className="text-xs text-gray-600">Students Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {cls.students.length}
                    </div>
                    <div className="text-xs text-gray-600">Total Students</div>
                  </div>
                </div>

                {cls.students.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <Plus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 italic">
                      No students enrolled yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Use the CSV importer to add students and start tracking
                      STEM-1 progress
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left table-auto">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b bg-gray-50">
                          <th className="py-2 px-3 font-medium">Student ID</th>
                          <th className="py-2 px-3 font-medium">Name</th>
                          <th className="py-2 px-3 font-medium">Email</th>
                          <th className="py-2 px-3 font-medium">
                            STEM-1 Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cls.students.map((student) => {
                          // Mock STEM-1 status for display
                          const mockPassed = Math.random() > 0.3;
                          return (
                            <tr
                              key={student.id}
                              className="border-b text-sm text-gray-800 hover:bg-gray-50"
                            >
                              <td className="py-2 px-3 font-mono text-xs">
                                {student.id}
                              </td>
                              <td className="py-2 px-3 font-medium">
                                {student.name}
                              </td>
                              <td className="py-2 px-3">
                                {student.email ?? (
                                  <span className="text-gray-400 italic">
                                    N/A
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    mockPassed
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {mockPassed
                                    ? "STEM-1 Complete"
                                    : "In Progress"}
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
            );
          })}
        </div>
      )}

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default ClassesPage;
