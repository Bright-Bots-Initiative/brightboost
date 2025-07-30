import React, { useState, useRef, useCallback } from 'react';
import { Download, CheckCircle, Zap, Users, Target, TrendingUp } from 'lucide-react';
import { Class } from './types';
import { exportSTEM1GradesToCSV, getSTEM1Summary } from '../../services/stem1GradeService';

interface ExportGradesButtonProps {
  classData: Class;
  teacherName?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const ExportGradesButton: React.FC<ExportGradesButtonProps> = ({
  classData,
  teacherName = 'Teacher',
  variant = 'primary',
  size = 'md'
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleExport = async () => {
    if (classData.students.length === 0) {
      alert('No students in this class to export STEM-1 progress for.');
      return;
    }

    setIsExporting(true);
    try {
      await exportSTEM1GradesToCSV(classData, teacherName);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('STEM-1 export failed:', error);
      alert('Failed to export STEM-1 progress. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150); // Small delay to allow moving to tooltip
  }, []);

  const handleFocus = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleBlur = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowTooltip(false);
      buttonRef.current?.blur();
    }
  }, []);

  const stem1Summary = getSTEM1Summary(classData);

  const baseClasses = "relative flex items-center transition-all duration-200 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-brightboost-green text-white hover:bg-green-600 focus:ring-brightboost-green shadow-md hover:shadow-lg disabled:bg-gray-400",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300 hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  const getButtonContent = () => {
    if (exportSuccess) {
      return (
        <>
          <CheckCircle className={`${iconSizes[size]} mr-2`} aria-hidden="true" />
          STEM-1 Progress Exported!
        </>
      );
    }

    if (isExporting) {
      return (
        <>
          <div 
            className={`${iconSizes[size]} mr-2 animate-spin rounded-full border-2 border-current border-t-transparent`}
            aria-hidden="true"
          />
          Exporting STEM-1...
        </>
      );
    }

    return (
      <>
        <Zap className={`${iconSizes[size]} mr-2`} aria-hidden="true" />
        Export STEM-1 Progress
        <Download className={`${iconSizes[size]} ml-1`} aria-hidden="true" />
      </>
    );
  };

  const getAriaLabel = () => {
    if (exportSuccess) return 'STEM-1 progress exported successfully';
    if (isExporting) return 'Exporting STEM-1 progress, please wait';
    if (classData.students.length === 0) return 'No students to export STEM-1 progress for';
    return `Export STEM-1 progress for ${classData.name} class with ${classData.students.length} students`;
  };

  const getButtonClass = () => {
    if (exportSuccess) {
      return `${baseClasses} ${sizeClasses[size]} bg-green-500 text-white shadow-md`;
    }
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
      isExporting || classData.students.length === 0 
        ? 'opacity-50' 
        : 'hover:shadow-md transform hover:scale-105'
    }`;
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleExport}
        disabled={isExporting || classData.students.length === 0 || exportSuccess}
        className={getButtonClass()}
        aria-label={getAriaLabel()}
        aria-describedby={showTooltip ? 'export-tooltip' : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        {getButtonContent()}
      </button>

      {/* Enhanced accessible tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          id="export-tooltip"
          role="tooltip"
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 shadow-xl max-w-xs"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="text-center">
            <div className="font-semibold text-brightboost-light mb-2 flex items-center justify-center">
              <Zap className="w-3 h-3 mr-1" aria-hidden="true" />
              {classData.name} - STEM-1 Progress
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-left mb-2">
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1 text-blue-300" aria-hidden="true" />
                <span>Students: {stem1Summary.totalStudents}</span>
              </div>
              <div className="flex items-center">
                <Target className="w-3 h-3 mr-1 text-green-300" aria-hidden="true" />
                <span>Passed: {stem1Summary.studentsPassedSTEM1}</span>
              </div>
              <div className="flex items-center">
                <Zap className="w-3 h-3 mr-1 text-yellow-300" aria-hidden="true" />
                <span>Avg XP: {stem1Summary.averageXP}/500</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-purple-300" aria-hidden="true" />
                <span>Completion: {stem1Summary.averageCompletion}%</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-300 border-t border-gray-700 pt-2">
              <div>Updated: {stem1Summary.lastUpdated}</div>
              <div className="mt-1 text-gray-400">
                {classData.students.length === 0 
                  ? 'No students enrolled' 
                  : 'Click to download CSV report'
                }
              </div>
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" aria-hidden="true"></div>
        </div>
      )}

      {/* Screen reader only status */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isExporting && 'Exporting STEM-1 progress data'}
        {exportSuccess && 'STEM-1 progress exported successfully'}
      </div>
    </div>
  );
};

export default ExportGradesButton;