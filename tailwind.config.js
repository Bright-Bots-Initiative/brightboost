/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brightboost-navy': '#1e3a8a',
        'brightboost-blue': '#3b82f6',
        'brightboost-light': '#dbeafe',
        'brightboost-green': '#10b981',
        'brightboost-yellow': '#f59e0b',
        'brightboost-red': '#ef4444',
      },
    },
  },
  plugins: [],
};