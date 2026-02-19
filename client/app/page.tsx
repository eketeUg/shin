'use client';

import { useState } from 'react';
import GameCanvasWrapper from './components/GameCanvasWrapper';
import LoadingScreen from './components/LoadingScreen';
import MainMenu from './components/MainMenu';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  const handleStartGame = () => {
    setIsGameStarted(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Loading Screen */}
      {isLoading && <LoadingScreen onComplete={handleLoadComplete} />}

      {/* Main Menu (Visible after load, before game start) */}
      {!isLoading && !isGameStarted && <MainMenu onStart={handleStartGame} />}

      {/* Game Canvas (Visible after start) */}
      {isGameStarted && (
        <div className="absolute inset-0 animate-in fade-in duration-1000">
          <GameCanvasWrapper />
          
          {/* Optional: Simple Back/Exit Button overlaid */}
          <button 
            onClick={() => setIsGameStarted(false)}
            className="absolute top-4 left-4 z-50 text-white/50 hover:text-white text-xs uppercase tracking-widest border border-white/10 px-3 py-1 bg-black/50 backdrop-blur-sm"
          >
            Exit Match
          </button>
        </div>
      )}
    </main>
  );
}
