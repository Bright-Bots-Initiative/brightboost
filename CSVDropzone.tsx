import React, { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';

interface CSVDropzoneProps {
  onFileUpload: (csvContent: string) => void;
}

const CSVDropzone: React.FC<CSVDropzoneProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      onFileUpload(csvContent);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      alert('Error reading file');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }, [onFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragOver
          ? 'border-brightboost-blue bg-blue-50'
          : 'border-gray-300 hover:border-brightboost-blue hover:bg-gray-50'
      } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {isProcessing ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brightboost-blue mb-4"></div>
          <p className="text-gray-600">Processing file...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Upload className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drop your CSV file here
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse files
          </p>
          <label className="inline-flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors cursor-pointer">
            <FileText className="w-4 h-4 mr-2" />
            Choose File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default CSVDropzone;