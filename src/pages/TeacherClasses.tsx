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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Your Classes</h3>
          <table className="w-full text-left table-auto">
            <thead>
              <tr className="text-sm text-gray-600">
                <th className="pb-2">Class ID</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Students</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id} className="border-t text-sm">
                  <td className="py-2">{cls.id}</td>
                  <td className="py-2">{cls.name}</td>
                  <td className="py-2">{cls.students.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;
