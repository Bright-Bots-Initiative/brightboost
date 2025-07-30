import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface CSVDropzoneProps {
  onFileUpload: (csvContent: string) => void;
}

const CSVDropzone: React.FC<CSVDropzoneProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      return 'Please upload a CSV file (.csv extension required)';
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return 'File size must be less than 5MB';
    }
    if (file.size === 0) {
      return 'File appears to be empty. Please check your CSV file';
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    setValidationError(null);
    setUploadSuccess(false);

    const validationResult = validateFile(file);
    if (validationResult) {
      setValidationError(validationResult);
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      if (!csvContent || csvContent.trim().length === 0) {
        setValidationError('CSV file appears to be empty or unreadable');
        setIsProcessing(false);
        return;
      }
      
      try {
        onFileUpload(csvContent);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } catch (error) {
        setValidationError('Failed to process CSV file. Please check the format and try again.');
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      setValidationError('Error reading file. Please try again with a different file.');
      setIsProcessing(false);
    };
    
    reader.readAsText(file);
  }, [onFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      setValidationError('No files were dropped. Please try again.');
      return;
    }
    if (files.length > 1) {
      setValidationError('Please upload only one CSV file at a time.');
      return;
    }
    
    handleFile(files[0]);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set drag over to false if we're leaving the dropzone entirely
    if (!dropzoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const getAriaLabel = () => {
    if (isProcessing) return 'Processing CSV file, please wait';
    if (uploadSuccess) return 'CSV file uploaded successfully';
    if (validationError) return `Upload failed: ${validationError}`;
    return 'Click or drag and drop to upload CSV file';
  };

  const getStatusIcon = () => {
    if (isProcessing) {
      return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brightboost-blue" aria-hidden="true" />;
    }
    if (uploadSuccess) {
      return <CheckCircle className="w-12 h-12 text-green-500" aria-hidden="true" />;
    }
    if (validationError) {
      return <AlertCircle className="w-12 h-12 text-red-500" aria-hidden="true" />;
    }
    return <Upload className="w-12 h-12 text-gray-400" aria-hidden="true" />;
  };

  const getStatusMessage = () => {
    if (isProcessing) return 'Processing your CSV file...';
    if (uploadSuccess) return 'CSV file uploaded successfully!';
    if (validationError) return validationError;
    return 'Drop your CSV file here';
  };

  const getSubMessage = () => {
    if (isProcessing || uploadSuccess || validationError) return null;
    return 'or click to browse files';
  };

  return (
    <div className="space-y-4">
      <div
        ref={dropzoneRef}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          focus:outline-none focus:ring-4 focus:ring-brightboost-blue focus:ring-opacity-50
          ${isDragOver
            ? 'border-brightboost-blue bg-blue-50 scale-105'
            : validationError
            ? 'border-red-300 bg-red-50 hover:border-red-400'
            : uploadSuccess
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 hover:border-brightboost-blue hover:bg-gray-50'
          }
          ${isProcessing ? 'opacity-75 cursor-wait' : 'hover:shadow-md'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={getAriaLabel()}
        aria-describedby="dropzone-description dropzone-instructions"
        aria-disabled={isProcessing}
      >
        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}
          
          <div className="space-y-2">
            <p 
              className={`text-lg font-medium ${
                validationError ? 'text-red-700' : 
                uploadSuccess ? 'text-green-700' : 
                'text-gray-700'
              }`}
            >
              {getStatusMessage()}
            </p>
            
            {getSubMessage() && (
              <p className="text-sm text-gray-500">
                {getSubMessage()}
              </p>
            )}
          </div>

          {!isProcessing && !uploadSuccess && !validationError && (
            <label className="inline-flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:ring-offset-2">
              <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
              Choose File
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileInput}
                className="sr-only"
                aria-describedby="file-input-description"
              />
            </label>
          )}
        </div>
      </div>

      {/* Screen reader only descriptions */}
      <div className="sr-only">
        <div id="dropzone-description">
          Upload a CSV file containing your class roster data. The file should include student names, emails, and class information.
        </div>
        <div id="dropzone-instructions">
          You can drag and drop a file onto this area, or click to open a file browser. Press Enter or Space to activate.
        </div>
        <div id="file-input-description">
          Select a CSV file from your computer. Only .csv files are accepted, maximum size 5MB.
        </div>
      </div>

      {/* Live region for status announcements */}
      <div 
        className="sr-only" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {isProcessing && 'Processing CSV file'}
        {uploadSuccess && 'CSV file uploaded successfully'}
        {validationError && `Upload error: ${validationError}`}
      </div>
    </div>
  );
};

export default CSVDropzone;