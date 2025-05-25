import React from 'react';

/**
 * LoadingSpinner component that displays while lazy-loaded components are being loaded
 */
const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-12 h-12 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
    </div>
  );
};

export default LoadingSpinner;
