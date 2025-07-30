import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Class, ParsedClassData } from './types';
import CSVDropzone from './CSVDropzone';
import CSVSummary from './CSVSummary';
import { parseCSVData, validateCSVData } from '../../utils/csvParser';
import { bulkImportClass } from '../../services/mockClassService';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = 'upload' | 'summary' | 'success' | 'error';

const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedClassData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedClassId, setImportedClassId] = useState<string | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the modal after a brief delay to ensure it's rendered
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    } else {
      // Return focus to the element that opened the modal
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // Trap focus within modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, []);

  const handleFileUpload = (csvContent: string) => {
    setUploadError(null);
    setValidationErrors([]);
    
    try {
      const parsed = parseCSVData(csvContent);
      const errors = validateCSVData(parsed);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        setCurrentStep('error');
        return;
      }

      setParsedData(parsed);
      setCurrentStep('summary');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('CSV parsing error:', String(error));
      setUploadError(`Upload failed: ${errorMessage}`);
      setCurrentStep('upload');
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);
    try {
      const newClass: Omit<Class, 'id'> = {
        name: parsedData.className,
        grade: parsedData.grade as Class['grade'],
        students: parsedData.students
      };

      const importedClass = await bulkImportClass(newClass);
      setImportedClassId(importedClass.id);
      setCurrentStep('success');
    } catch (error) {
      setValidationErrors(['Failed to import class. Please try again.']);
      setCurrentStep('error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSuccess = () => {
    if (importedClassId) {
      navigate(`/teacher/classes/${importedClassId}`);
    }
    onClose();
    resetModal();
  };

  const resetModal = () => {
    setCurrentStep('upload');
    setParsedData(null);
    setValidationErrors([]);
    setUploadError(null);
    setIsImporting(false);
    setImportedClassId(null);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload': return 'Upload CSV File';
      case 'summary': return 'Import Summary';
      case 'success': return 'Import Successful';
      case 'error': return 'Import Failed';
      default: return 'Import Class from CSV';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'upload': return 'Upload a CSV file with your class roster data';
      case 'summary': return 'Review the parsed data before importing';
      case 'success': return 'Your class has been successfully imported';
      case 'error': return 'There were errors with your CSV file';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto focus:outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold text-brightboost-navy">
              Import Class from CSV
            </h2>
            <p id="modal-description" className="text-sm text-gray-600 mt-1">
              {getStepDescription()}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
            aria-label="Close import dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                currentStep === 'upload' ? 'bg-brightboost-blue' : 
                ['summary', 'success', 'error'].includes(currentStep) ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className={`text-sm ${currentStep === 'upload' ? 'font-medium text-brightboost-blue' : 'text-gray-600'}`}>
                Upload
              </span>
            </div>
            <div className={`flex-1 h-0.5 ${
              ['summary', 'success', 'error'].includes(currentStep) ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                currentStep === 'summary' ? 'bg-brightboost-blue' : 
                ['success', 'error'].includes(currentStep) ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className={`text-sm ${currentStep === 'summary' ? 'font-medium text-brightboost-blue' : 'text-gray-600'}`}>
                Review
              </span>
            </div>
            <div className={`flex-1 h-0.5 ${
              ['success', 'error'].includes(currentStep) ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                ['success', 'error'].includes(currentStep) ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className={`text-sm ${['success', 'error'].includes(currentStep) ? 'font-medium text-green-600' : 'text-gray-600'}`}>
                Complete
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {currentStep === 'upload' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">{getStepTitle()}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Upload a CSV file with your class roster. The file should include columns for student name, email, and optionally student ID.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Expected CSV Format:</h4>
                  <div className="text-sm text-blue-800 font-mono bg-white p-2 rounded border">
                    className,grade,studentName,studentEmail,studentId<br/>
                    "Math 101","5th","John Doe","john@example.com","STU001"<br/>
                    "Math 101","5th","Jane Smith","jane@example.com","STU002"
                  </div>
                </div>
              </div>
              <CSVDropzone onFileUpload={handleFileUpload} />
              {uploadError && (
                <div 
                  className="p-3 mt-4 bg-red-50 text-red-700 rounded-md border border-red-200"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>{uploadError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'summary' && parsedData && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-brightboost-blue" aria-hidden="true" />
                  {getStepTitle()}
                </h3>
                <p className="text-gray-600 text-sm">
                  Review the parsed data before importing.
                </p>
              </div>
              <CSVSummary data={parsedData} />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                  aria-describedby={isImporting ? 'importing-status' : undefined}
                >
                  {isImporting ? 'Importing...' : 'Confirm Import'}
                </button>
                {isImporting && (
                  <span id="importing-status" className="sr-only">
                    Import in progress, please wait
                  </span>
                )}
              </div>
            </div>
          )}

          {currentStep === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium mb-2">{getStepTitle()}</h3>
              <p className="text-gray-600 mb-6">
                Your class has been successfully imported. You'll be redirected to the class detail page.
              </p>
              <button
                onClick={handleSuccess}
                className="px-6 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
              >
                View Class
              </button>
            </div>
          )}

          {currentStep === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium mb-2">{getStepTitle()}</h3>
              <div 
                className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
                role="alert"
                aria-live="polite"
              >
                <h4 className="font-medium text-red-900 mb-2">Errors found:</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live region for dynamic announcements */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {currentStep === 'summary' && 'CSV data parsed successfully, review before importing'}
          {currentStep === 'success' && 'Class imported successfully'}
          {currentStep === 'error' && 'Import failed, please review errors'}
          {isImporting && 'Import in progress'}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
