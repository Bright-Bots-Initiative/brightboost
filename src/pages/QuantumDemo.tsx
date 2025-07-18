import React, { useEffect, useState } from 'react';
import GameBackground from '../components/GameBackground';
import { grantXp, wasXpGrantedInSession } from '../lib/xp';

const QuantumDemo: React.FC = () => {
  const [xpGranted, setXpGranted] = useState(false);

  useEffect(() => {
    if (wasXpGrantedInSession('quantum_demo_visit')) {
      setXpGranted(true);
    }
  }, []);

  const handlePlayClick = async () => {
    if (!xpGranted) {
      try {
        const success = await grantXp('quantum_demo_visit');
        if (success) {
          setXpGranted(true);
          console.log('XP granted for quantum demo visit');
        }
      } catch (error) {
        console.error('Failed to grant XP:', error);
      }
    }
    // Open the game in a new tab
    window.open('https://quantumai.google/education/thequbitgame', '_blank', 'noopener,noreferrer');
  };

  return (
    <GameBackground>
      <div className="min-h-screen flex flex-col relative z-10">
        <nav className="bg-brightboost-lightblue text-brightboost-navy p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Bright Boost</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Quantum Demo</span>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4 flex-grow">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-brightboost-navy mb-2">
              The Qubit Game
            </h2>
            <p className="text-brightboost-navy">
              Explore quantum computing concepts through interactive gameplay! Click the button below to launch the game in a new tab.
            </p>
            {xpGranted && (
              <div className="mt-2 inline-block bg-brightboost-yellow text-brightboost-navy px-3 py-1 rounded-full text-sm">
                ✨ XP Awarded!
              </div>
            )}
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={handlePlayClick}
              className="bg-brightboost-blue text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-brightboost-blue/80 focus:outline-none focus:ring-2 focus:ring-brightboost-lightblue focus:ring-offset-2"
            >
              Play The Qubit Game
            </button>
          </div>
        </main>
      </div>
    </GameBackground>
  );
};

export default QuantumDemo;
