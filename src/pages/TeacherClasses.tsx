import React, { useEffect, useState } from "react";
import { Class } from "../components/TeacherDashboard/types";
import { fetchMockClasses } from "../services/mockClassService";
import BrightBoostRobot from "../components/BrightBoostRobot";
import CSVImportModal from "../components/TeacherDashboard/CSVImportModal";
import ProfileModal from "../components/TeacherDashboard/ProfileModal";
import EditProfileModal from "../components/TeacherDashboard/EditProfileModal";
import { Upload, Plus, Zap, Users, TrendingUp, User } from "lucide-react";
import { Link } from "react-router-dom";
import ExportGradesButton from "../components/TeacherDashboard/ExportGradesButton";
import { useAuth } from "../contexts/AuthContext";
import { getSTEM1Summary } from "../services/stem1GradeService";
import { UserProfile } from "../services/profileService";

const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const loadClasses = async () => {
      setIsLoading(true);
      const result = await fetchMockClasses();
      setClasses(result);
      setIsLoading(false);
    };
    loadClasses();
  }, []);

  const handleViewStudentProfile = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsProfileModalOpen(true);
  };

  const handleProfileUpdated = (profile: UserProfile) => {
    console.log("Profile updated:", profile);
  };

  return (
    <main className="w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brightboost-navy flex items-center">
            <Zap className="w-7 h-7 mr-2 text-brightboost-blue" />
            STEM-1 Classes
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your K-2 STEM classes and track student progress through core
            quests
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:scale-100"
            aria-label="Import class data from CSV file"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import from CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-lg shadow-md" aria-live="polite" aria-busy="true">
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
        <section className="bg-white rounded-lg shadow-md p-8 text-center" aria-labelledby="empty-state-heading">
          <BrightBoostRobot size="lg" />
          <h2 id="empty-state-heading" className="text-xl text-brightboost-navy mt-4">
            No STEM-1 classes found.
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Import your first class to start tracking student progress
          </p>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
            aria-label="Import your first class from CSV"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Class from CSV
          </button>
        </section>
      ) : (
        <section className="space-y-6" aria-labelledby="classes-list-heading">
          <h2 id="classes-list-heading" className="sr-only">List of STEM-1 Classes</h2>
          {classes.map((cls) => {
            const stem1Summary = getSTEM1Summary(cls);
            return (
              <article
                key={cls.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 hover:border-brightboost-light"
                aria-labelledby={`class-${cls.id}-title`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <Link
                      to={`/teacher/classes/${cls.id}`}
                      id={`class-${cls.id}-title`}
                      className="text-lg font-semibold text-brightboost-navy hover:text-brightboost-blue transition-colors flex items-center focus:outline-none focus:ring-2 focus:ring-brightboost-blue rounded"
                      aria-describedby={`class-${cls.id}-summary`}
                    >
                      <Zap className="w-5 h-5 mr-2 text-brightboost-blue" />
                      {cls.name}
                    </Link>
                    <div id={`class-${cls.id}-summary`} className="flex items-center space-x-6 mt-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        <span aria-label={`Grade level: ${cls.grade ?? "Not specified"}`}>
                          Grade: {cls.grade ?? "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        <span aria-label={`${cls.students.length} students enrolled`}>
                          {cls.students.length} students
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span aria-label={`${stem1Summary.studentsPassedSTEM1} out of ${stem1Summary.totalStudents} students passed STEM-1`}>
                          {stem1Summary.studentsPassedSTEM1}/
                          {stem1Summary.totalStudents} passed STEM-1
                        </span>
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
                      className="flex items-center px-3 py-1.5 text-sm bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                      aria-label={`View details for ${cls.name}`}
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                {/* STEM-1 Progress Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100" role="region" aria-label="STEM-1 Progress Summary">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brightboost-blue" aria-label={`Average XP: ${stem1Summary.averageXP} out of 500`}>
                      {stem1Summary.averageXP}
                    </div>
                    <div className="text-xs text-gray-600">Avg XP / 500</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brightboost-green" aria-label={`Average completion: ${stem1Summary.averageCompletion} percent`}>
                      {stem1Summary.averageCompletion}%
                    </div>
                    <div className="text-xs text-gray-600">Avg Completion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brightboost-yellow" aria-label={`${stem1Summary.studentsPassedSTEM1} students passed`}>
                      {stem1Summary.studentsPassedSTEM1}
                    </div>
                    <div className="text-xs text-gray-600">Students Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600" aria-label={`${cls.students.length} total students`}>
                      {cls.students.length}
                    </div>
                    <div className="text-xs text-gray-600">Total Students</div>
                  </div>
                </div>

                {cls.students.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg" role="status" aria-label="No students enrolled">
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
                    <table className="w-full text-left table-auto" role="table" aria-label={`Student roster for ${cls.name}`}>
                      <thead>
                        <tr className="text-xs text-gray-500 border-b bg-gray-50">
                          <th scope="col" className="py-2 px-3 font-medium">Student ID</th>
                          <th scope="col" className="py-2 px-3 font-medium">Name</th>
                          <th scope="col" className="py-2 px-3 font-medium">Email</th>
                          <th scope="col" className="py-2 px-3 font-medium">
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
                              <th scope="row" className="py-2 px-3 font-mono text-xs">
                                {student.id}
                              </th>
                              <td className="py-2 px-3 font-medium">
                                {student.name}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() =>
                                      handleViewStudentProfile(student.id)
                                    }
                                    aria-label={`View profile for ${student.name}`}
                                    className="flex items-center justify-center px-2 py-1 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors hover:shadow-md"
                                    title="View student profile"
                                  >
                                    <User className="w-4 h-4" />
                                  </button>
                                  <span>
                                    {student.email ?? (
                                      <span className="text-gray-400 italic">
                                        N/A
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    mockPassed
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                  aria-label={`STEM-1 status: ${mockPassed ? "Complete" : "In Progress"}`}
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
              </article>
            );
          })}
        </section>
      )}

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedStudentId(null);
        }}
        studentId={selectedStudentId || undefined}
        isTeacherProfile={!selectedStudentId}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />
    </main>
  );
};

export default ClassesPage;