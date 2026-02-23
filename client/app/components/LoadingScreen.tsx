'use client';

import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleProgress = (e: any) => {
      setProgress(e.detail.progress * 100);
    };

    const handleComplete = () => {
      setProgress(100);
      setTimeout(onComplete, 500); // Slight delay at 100%
    };

    window.addEventListener('phaserLoadProgress', handleProgress);
    window.addEventListener('phaserLoadComplete', handleComplete);

    return () => {
      window.removeEventListener('phaserLoadProgress', handleProgress);
      window.removeEventListener('phaserLoadComplete', handleComplete);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-md">
      {/* Logo Container */}
      <div className="relative mb-8 md:mb-12">
        <h1 className="text-6xl md:text-9xl font-black font-cinzel tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 glow-text animate-pulse">
          SHIN
        </h1>
        <div className="absolute -bottom-2 md:-bottom-4 left-0 w-full h-1 bg-shin-red shadow-[0_0_20px_rgba(255,0,0,0.8)]"></div>
      </div>

      {/* Progress Bar */}
      <div className="w-64 md:w-96 h-1 md:h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
        <div 
          className="h-full bg-gradient-to-r from-shin-red to-red-900 transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className="mt-4 text-xs text-gray-500 font-mono uppercase tracking-widest">
        Loading Assets... {Math.floor(progress)}%
      </p>
    </div>
  );
};

export default LoadingScreen;
