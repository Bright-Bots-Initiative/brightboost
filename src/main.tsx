
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Add this for debugging
const debugAuth = () => {
  // Listen for localStorage changes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, value: string) {
    const event = new Event('storageChange');
    document.dispatchEvent(event);
    originalSetItem.call(localStorage, key, value);
    console.log(`localStorage.setItem('${key}', '${value.substring(0, 20)}${value.length > 20 ? '...' : ''}')`);
  };
  
  // Log navigation attempts
  console.log('Auth debugging enabled');
};

// Enable auth debugging
debugAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
