import React, { useState } from "react";
import { X, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Class, ParsedClassData } from "./types";
import CSVDropzone from "./CSVDropzone";
import CSVSummary from "./CSVSummary";
import { parseCSVData, validateCSVData } from "../../utils/csvParser";
import { bulkImportClass } from "../../services/mockClassService";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = "upload" | "summary" | "success" | "error";

const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [parsedData, setParsedData] = useState<ParsedClassData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedClassId, setImportedClassId] = useState<string | null>(null);

  const handleFileUpload = (csvContent: string) => {
    setUploadError(null); // Clear previous errors
    try {
      const parsed = parseCSVData(csvContent);
      const errors = validateCSVData(parsed);

      if (errors.length > 0) {
        setValidationErrors(errors);
        setCurrentStep("error");
        return;
      }

      setParsedData(parsed);
      setCurrentStep("summary");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("CSV parsing error:", errorMessage);
      setUploadError(`Upload failed: ${errorMessage}`);
      setCurrentStep("upload"); // Stay on upload step to show error
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);
    try {
      const newClass: Omit<Class, "id"> = {
        name: parsedData.className,
        grade: parsedData.grade as Class["grade"],
        students: parsedData.students,
      };

      const importedClass = await bulkImportClass(newClass);
      setImportedClassId(importedClass.id);
      setCurrentStep("success");
    } catch (error) {
      setValidationErrors(["Failed to import class. Please try again."]);
      setCurrentStep("error");
      console.error("Import error:", error);
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
    setCurrentStep("upload");
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 id="csv-import-title" className="text-xl font-semibold text-brightboost-navy">
            Import Class from CSV
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close CSV import modal"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6" role="main">
          {/* Progress indicator */}
          <div className="mb-6" role="progressbar" aria-valuenow={
            currentStep === "upload" ? 1 : 
            currentStep === "summary" ? 2 : 
            currentStep === "success" ? 3 : 1
          } aria-valuemin={1} aria-valuemax={3} aria-label="Import progress">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className={currentStep === "upload" ? "font-medium text-brightboost-blue" : ""}>
                1. Upload
              </span>
              <span className={currentStep === "summary" ? "font-medium text-brightboost-blue" : ""}>
                2. Review
              </span>
              <span className={currentStep === "success" ? "font-medium text-brightboost-blue" : ""}>
                3. Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-brightboost-blue h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: currentStep === "upload" ? "33%" : 
                         currentStep === "summary" ? "66%" : 
                         currentStep === "success" ? "100%" : "33%" 
                }}
              ></div>
            </div>
          </div>

          {currentStep === "upload" && (
            <section aria-labelledby="upload-section">
              <div className="mb-6">
                <h3 id="upload-section" className="text-lg font-medium mb-2">Upload CSV File</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Upload a CSV file with your class roster. The file should
                  include columns for student name, email, and optionally
                  student ID.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Expected CSV Format:
                  </h4>
                  <div className="text-sm text-blue-800 font-mono">
                    className,grade,studentName,studentEmail,studentId
                    <br />
                    "Math 101","5th","John Doe","john@example.com","STU001"
                    <br />
                    "Math 101","5th","Jane Smith","jane@example.com","STU002"
                  </div>
                </div>
              </div>
              <CSVDropzone onFileUpload={handleFileUpload} />
              {uploadError && (
                <div className="p-3 mt-4 bg-red-50 text-red-700 rounded-md border border-red-200" role="alert" aria-live="polite">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span>⚠️ {uploadError}</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {currentStep === "summary" && parsedData && (
            <section aria-labelledby="summary-section">
              <div className="mb-6">
                <h3 id="summary-section" className="text-lg font-medium mb-2 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-brightboost-blue" />
                  Import Summary
                </h3>
                <p className="text-gray-600 text-sm">
                  Review the parsed data before importing.
                </p>
              </div>
              <CSVSummary data={parsedData} />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setCurrentStep("upload")}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                  aria-describedby={isImporting ? "importing-status" : undefined}
                >
                  {isImporting ? "Importing..." : "Confirm Import"}
                </button>
                {isImporting && (
                  <span id="importing-status" className="sr-only" aria-live="polite">
                    Import in progress, please wait
                  </span>
                )}
              </div>
            </section>
          )}

          {currentStep === "success" && (
            <section className="text-center" aria-labelledby="success-section" role="alert" aria-live="polite">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 id="success-section" className="text-lg font-medium mb-2">Import Successful!</h3>
              <p className="text-gray-600 mb-6">
                Your class has been successfully imported. You'll be redirected
                to the class detail page.
              </p>
              <button
                onClick={handleSuccess}
                className="px-6 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
              >
                View Class
              </button>
            </section>
          )}

          {currentStep === "error" && (
            <section className="text-center" aria-labelledby="error-section" role="alert" aria-live="polite">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 id="error-section" className="text-lg font-medium mb-2">Import Failed</h3>
              <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-red-900 mb-2">Errors found:</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setCurrentStep("upload")}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;