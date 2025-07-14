import React, { useState, useEffect, useRef } from 'react';
import IframeResizer from '@iframe-resizer/react';
import GameBackground from '../components/GameBackground';
import { grantXp, wasXpGrantedInSession } from '../lib/xp';

const QuantumDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTime, setLoadingTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [xpGranted, setXpGranted] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout>();

  const REMOTE_URL = 'https://quantumai.google/education/thequbitgame';
  const FALLBACK_URL = 'https://cl-quantum-game.appspot.com/';

  useEffect(() => {
    loadingTimerRef.current = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    if (wasXpGrantedInSession('quantum_demo_visit')) {
      setXpGranted(true);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'x-frame-option-block' || 
          (typeof event.data === 'string' && event.data.includes('frame'))) {
        console.log('X-Frame-Options blocking detected, switching to fallback');
        setUseFallback(true);
        setHasError(false);
      }
    };

    const cspTimeout = setTimeout(() => {
      if (isLoading && !useFallback) {
        console.log('CSP blocking suspected due to loading timeout, switching to fallback');
        setUseFallback(true);
        setHasError(false);
        setIsLoading(false);
      }
    }, 15000); // 15 second timeout for CSP detection

    window.addEventListener('message', handleMessage);

    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
      clearTimeout(cspTimeout);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleIframeLoad = async () => {
    setIsLoading(false);
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
    }

    if (!xpGranted && !wasXpGrantedInSession('quantum_demo_visit')) {
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
  };

  const handleIframeError = () => {
    console.log('Iframe failed to load, switching to fallback');
    setHasError(true);
    setUseFallback(true);
    setIsLoading(false);
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
    }
  };

  const currentUrl = useFallback ? FALLBACK_URL : REMOTE_URL;

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
              Explore quantum computing concepts through interactive gameplay!
            </p>
            {xpGranted && (
              <div className="mt-2 inline-block bg-brightboost-yellow text-brightboost-navy px-3 py-1 rounded-full text-sm">
                ✨ XP Awarded!
              </div>
            )}
          </div>

          <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brightboost-blue mb-4" role="status" aria-label="Loading"></div>
                <p className="text-brightboost-navy">
                  {loadingTime > 10 ? 'Loading Quantum Demo... This may take a moment' : 'Loading Quantum Demo...'}
                </p>
                {loadingTime > 5 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Loading time: {loadingTime}s
                  </p>
                )}
              </div>
            )}

            {hasError && !useFallback && (
              <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
                <div className="text-center p-8">
                  <h3 className="text-lg font-bold text-brightboost-navy mb-2">
                    Unable to load the game
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Switching to local version...
                  </p>
                  <button
                    onClick={() => setUseFallback(true)}
                    className="bg-brightboost-blue text-white px-4 py-2 rounded-lg hover:bg-brightboost-blue/80"
                  >
                    Try Local Version
                  </button>
                </div>
              </div>
            )}

            <div className="w-full" style={{ minHeight: '480px' }}>
              <IframeResizer
                src={currentUrl}
                title="Quantum computing mini-game"
                style={{
                  width: '100%',
                  minHeight: '480px',
                  border: 'none'
                }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                license="GPLv3"
              />
            </div>
          </div>

          {useFallback && (
            <div className="mt-4 p-3 bg-brightboost-yellow bg-opacity-20 rounded-lg">
              <p className="text-sm text-brightboost-navy">
                <strong>Note:</strong> Running local version of the Qubit Game due to network restrictions.
              </p>
            </div>
          )}
        </main>
      </div>
    </GameBackground>
  );
};

export default QuantumDemo;
