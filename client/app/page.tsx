'use client';

import { useState, useRef, useEffect } from 'react';
import GameCanvasWrapper from './components/GameCanvasWrapper';
import LoadingScreen from './components/LoadingScreen';
import MainMenu from './components/MainMenu';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const bgMusicRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Try to play audio when loading completes
  useEffect(() => {
    if (!isLoading && bgMusicRef.current) {
      bgMusicRef.current.play()
        .then(() => setIsMuted(false)) // Success, audio is playing
        .catch(e => {
            console.log('Autoplay prevented by browser:', e);
            setIsMuted(true); // Browser blocked it, show "UNMUTE" button
        });
    }
  }, [isLoading]);

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

      {/* Website Background Music (Stops when game starts) */}
      {!isGameStarted && (
        <>
          <audio 
            ref={bgMusicRef} 
            src="/assets/sounds/website_bgm.wav" 
            loop 
            muted={isMuted}
          />
          
          <button 
            className="absolute top-4 left-4 z-50 bg-black/50 border border-white/10 text-white/80 hover:text-white px-4 py-2 text-xs font-bold rounded transition-colors backdrop-blur-sm"
            onClick={() => {
              const audio = bgMusicRef.current;
              if (audio) {
                if (audio.muted) {
                  audio.muted = false;
                  audio.play().catch(e => console.log('Audio play failed:', e));
                  setIsMuted(false);
                } else {
                  audio.muted = true;
                  setIsMuted(true);
                }
              }
            }}
          >
            {isMuted ? '🔇 UNMUTE' : '🔊 MUTE'}
          </button>
        </>
      )}
    </main>
  );
}
