import React, { useEffect, useState } from "react";
import { Class } from "../components/TeacherDashboard/types";
import { fetchMockClasses } from "../services/mockClassService";
import BrightBoostRobot from "../components/BrightBoostRobot";
import ClassTable from "../components/TeacherDashboard/ClassTable";
import CSVImportModal from "../components/CSVImport/CSVImportModal";
import { Upload } from "lucide-react";

const ClassesPage: React.FC = () => {
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

  const handleImportSuccess = () => {
    // Refresh classes list after successful import
    const loadClasses = async () => {
      const result = await fetchMockClasses();
      setClasses(result);
    };
    loadClasses();
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-brightboost-navy">
          Classes
        </h2>
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import from CSV
        </button>
      </div>

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
        <ClassTable classes={classes} />
      )}

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default ClassesPage;
