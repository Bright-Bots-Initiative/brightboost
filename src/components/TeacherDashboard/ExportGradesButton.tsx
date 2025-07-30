import React, { useState } from "react";
import { Download, CheckCircle, Zap } from "lucide-react";
import { Class } from "./types";
import {
  exportSTEM1GradesToCSV,
  getSTEM1Summary,
} from "../../services/stem1GradeService";

interface ExportGradesButtonProps {
  classData: Class;
  teacherName?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

const ExportGradesButton: React.FC<ExportGradesButtonProps> = ({
  classData,
  teacherName = "Teacher",
  variant = "primary",
  size = "md",
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    if (classData.students.length === 0) {
      alert("No students in this class to export STEM-1 progress for.");
      return;
    }

    setIsExporting(true);
    try {
      await exportSTEM1GradesToCSV(classData, teacherName);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error("STEM-1 export failed:", error);
      alert("Failed to export STEM-1 progress. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const stem1Summary = getSTEM1Summary(classData);

  const baseClasses =
    "flex items-center transition-all duration-200 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    primary:
      "bg-brightboost-green text-white hover:bg-green-600 focus:ring-brightboost-green shadow-md hover:shadow-lg",
    secondary:
      "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300 hover:border-gray-400",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (exportSuccess) {
    return (
      <button
        className={`${baseClasses} ${sizeClasses[size]} bg-green-500 text-white shadow-md`}
        disabled
      >
        <CheckCircle className={`${iconSizes[size]} mr-2`} />
        STEM-1 Progress Exported!
      </button>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={handleExport}
        disabled={isExporting || classData.students.length === 0}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
          isExporting || classData.students.length === 0
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-md transform hover:scale-105"
        } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          variant === 'primary' ? 'focus:ring-brightboost-green' : 'focus:ring-gray-500'
        }`}
        title={
          classData.students.length === 0
            ? "No students to export"
            : "Export STEM-1 progress to CSV"
        }
        aria-describedby="export-tooltip"
        aria-label={`Export STEM-1 progress for ${classData.name} class`}
      >
        {isExporting ? (
          <>
            <div
              className={`${iconSizes[size]} mr-2 animate-spin rounded-full border-2 border-current border-t-transparent`}
              aria-hidden="true"
            ></div>
            <span aria-live="polite">Exporting STEM-1...</span>
          </>
        ) : (
          <>
            <Zap className={`${iconSizes[size]} mr-2`} />
            Export STEM-1 Progress
            <Download className={`${iconSizes[size]} ml-1`} />
          </>
        )}
      </button>

      {/* Enhanced tooltip with STEM-1 specific summary */}
      <div 
        id="export-tooltip"
        role="tooltip"
        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-xl"
        aria-hidden="true"
      >
        <div className="text-center">
          <div className="font-semibold text-brightboost-light mb-1">
            {classData.name} - STEM-1 Progress
          </div>
          <dl className="grid grid-cols-2 gap-2 text-left">
            <div><dt className="inline">Students:</dt> <dd className="inline">{stem1Summary.totalStudents}</dd></div>
            <div><dt className="inline">Passed:</dt> <dd className="inline">{stem1Summary.studentsPassedSTEM1}</dd></div>
            <div><dt className="inline">Avg XP:</dt> <dd className="inline">{stem1Summary.averageXP}/500</dd></div>
            <div><dt className="inline">Completion:</dt> <dd className="inline">{stem1Summary.averageCompletion}%</dd></div>
          </dl>
          <div className="mt-1 text-xs text-gray-300">
            Updated: {stem1Summary.lastUpdated}
          </div>
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
      
      {exportSuccess && (
        <div className="sr-only" aria-live="polite">
          STEM-1 progress exported successfully
        </div>
      )}
    </div>
  );
};

export default ExportGradesButton;