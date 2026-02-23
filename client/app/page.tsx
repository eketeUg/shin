'use client';

import { useState, useRef, useEffect } from 'react';
import GameCanvasWrapper from './components/GameCanvasWrapper';
import LoadingScreen from './components/LoadingScreen';
import MainMenu from './components/MainMenu';
import PreGameFlow, { GameMode, CharacterId, Roster } from './components/PreGameFlow';
import MintFighterFlow from './components/MintFighterFlow';
import { useUmi } from './components/UmiProvider';
import { fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showPreGameFlow, setShowPreGameFlow] = useState(false);
  const [showMintFlow, setShowMintFlow] = useState(false);
  const [ownedChars, setOwnedChars] = useState<string[]>([]);
  const bgMusicRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const umi = useUmi();

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

  const handleStartMenuClick = async () => {
    try {
      if (!umi.identity.publicKey) {
          setShowMintFlow(true); 
          return;
      }
      
      const assets = await fetchAssetsByOwner(umi, umi.identity.publicKey);
      if (assets.length > 0) {
        // Parse the character IDs from the asset names (e.g., "Kizu's Kunoichi" -> "Kunoichi" -> "kunoichi")
        const owned = assets.map(asset => {
           const className = asset.name.split("'s ")[1];
           const rosterMatch = Roster.find(r => r.name === className);
           return rosterMatch ? rosterMatch.id : null;
        }).filter(Boolean) as string[];
        
        setOwnedChars(owned.length > 0 ? owned : ['fighter']); // Fallback just in case
        setShowPreGameFlow(true);
      } else {
        // New player, needs to mint a character
        setShowMintFlow(true);
      }
    } catch (e) {
      console.error("Failed to fetch assets via Umi:", e);
      setShowMintFlow(true); // Fallback
    }
  };

  const handleStartFight = (mode: GameMode, p1: CharacterId, p2: CharacterId) => {
    setShowPreGameFlow(false);
    setIsGameStarted(true);
    // Tell Phaser to transition from Preloader to GameScene and pass config
    window.dispatchEvent(new CustomEvent('startGameScene', { detail: { mode, p1, p2 } }));
  };

  const toggleMute = () => {
    const audio = bgMusicRef.current;
    if (audio) {
      if (audio.muted || isMuted) { // Using isMuted too in case user toggled it before auto-play failed
        audio.muted = false;
        audio.play().catch(e => console.log('Audio play failed:', e));
        setIsMuted(false);
      } else {
        audio.muted = true;
        setIsMuted(true);
      }
    } else {
       // If audio element isn't mounted yet, just flip state
       setIsMuted(!isMuted);
    }
  };

  return (
    <main className="relative h-[100dvh] w-[100dvw] overflow-hidden">
      {/* Loading Screen */}
      {isLoading && <LoadingScreen onComplete={handleLoadComplete} />}

      {/* Main Menu (Visible after load, before pre-game flow) */}
      {!isLoading && !isGameStarted && !showPreGameFlow && !showMintFlow && (
        <MainMenu 
          onStart={handleStartMenuClick} 
          isMuted={isMuted} 
          onToggleMute={toggleMute} 
        />
      )}

      {/* Mint Fighter Flow (For new players without NFTs) */}
      {!isLoading && showMintFlow && (
        <MintFighterFlow 
          onMintComplete={() => {
            setShowMintFlow(false);
            setShowPreGameFlow(true);
          }}
          onBack={() => setShowMintFlow(false)}
        />
      )}

      {/* Pre-Game Flow (Mode and Character Selection) */}
      {!isLoading && showPreGameFlow && (
        <PreGameFlow 
          onStartFight={handleStartFight}
          onBack={() => setShowPreGameFlow(false)}
          ownedCharacters={ownedChars}
        />
      )}

      {/* Game Canvas (Always mounted so Preloader runs, but visually hidden until start) */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isGameStarted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <GameCanvasWrapper />
        
        {/* Optional: Simple Back/Exit Button overlaid */}
        {isGameStarted && (
          <button 
            onClick={() => setIsGameStarted(false)}
            className="absolute z-50 text-white/50 hover:text-white text-xs uppercase tracking-widest border border-white/10 px-3 py-1 bg-black/50 backdrop-blur-sm"
            style={{ top: 'max(1rem, env(safe-area-inset-top))', left: 'max(1rem, env(safe-area-inset-left))' }}
          >
            Exit Match
          </button>
        )}
      </div>

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
            className="absolute z-50 bg-black/50 border border-white/10 text-white/80 hover:text-white px-4 py-2 text-xs font-bold rounded transition-colors backdrop-blur-sm"
            style={{ top: 'max(1rem, env(safe-area-inset-top))', left: 'max(1rem, env(safe-area-inset-left))' }}
            onClick={toggleMute}
          >
            {isMuted ? '🔇 UNMUTE' : '🔊 MUTE'}
          </button>
        </>
      )}
    </main>
  );
}
