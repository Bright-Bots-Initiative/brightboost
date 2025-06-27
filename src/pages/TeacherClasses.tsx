import React, { useEffect, useState } from "react";
import { Class } from "../components/TeacherDashboard/types";
import { fetchMockClasses } from "../services/mockClassService";
import BrightBoostRobot from "../components/BrightBoostRobot";

const ClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      <h2 className="text-2xl font-bold mb-6 text-brightboost-navy">
        Classes
      </h2>

      {isLoading ? (
        <div className="bg-white p-6 rounded shadow-md">
          <div className="h-6 bg-gray-300 animate-pulse w-1/3 mb-4 rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((_, idx) => (
              <div key={idx} className="h-5 bg-gray-200 animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <BrightBoostRobot size="lg" />
          <p className="text-xl text-brightboost-navy mt-4">No classes found.</p>
          <p className="text-sm text-gray-600">Add a class to get started.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-100"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-brightboost-navy">
                  {cls.name}
                </h3>
                <p className="text-sm text-gray-500">Class ID: {cls.id}</p>
              </div>
              {cls.students.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No students enrolled.
                </p>
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
                    {cls.students.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b text-sm text-gray-800"
                      >
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
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassesPage;
