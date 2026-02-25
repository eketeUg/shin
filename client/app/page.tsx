'use client';

import { useState, useRef, useEffect } from 'react';
import GameCanvasWrapper from './components/GameCanvasWrapper';
import LoadingScreen from './components/LoadingScreen';
import MainMenu from './components/MainMenu';
import PreGameFlow, { GameMode, CharacterId, Roster } from './components/PreGameFlow';
import MintFighterFlow from './components/MintFighterFlow';
import LiveFightsFlow from './components/LiveFightsFlow';
import SpectatorGameCanvasWrapper from './components/SpectatorGameCanvasWrapper';
import MatchmakingScreen from './components/MatchmakingScreen';
import { useUmi } from './components/UmiProvider';
import { fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const [showPreGameFlow, setShowPreGameFlow] = useState(false);
  const [showMintFlow, setShowMintFlow] = useState(false);
  const [showLiveFights, setShowLiveFights] = useState(false);
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [initialMintChar, setInitialMintChar] = useState<CharacterId | null>(null);
  const [matchmakingP1Char, setMatchmakingP1Char] = useState<CharacterId | null>(null);
  const [ownedChars, setOwnedChars] = useState<string[]>([]);
  const [username, setUsername] = useState<string>('');
  const [spectatingMatch, setSpectatingMatch] = useState<any>(null);
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

  useEffect(() => {
    const handleLeaveSpectator = () => {
       setIsSpectating(false);
       setSpectatingMatch(null);
       setShowLiveFights(true);
    };
    window.addEventListener('leaveSpectator', handleLeaveSpectator);
    return () => window.removeEventListener('leaveSpectator', handleLeaveSpectator);
  }, []);

  const handleStartMenuClick = async (playerName: string) => {
    try {
      setUsername(playerName);
      if (!umi.identity.publicKey) {
          setInitialMintChar(null);
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
        setInitialMintChar(null);
        setShowMintFlow(true);
      }
    } catch (e) {
      console.error("Failed to fetch assets via Umi:", e);
      setInitialMintChar(null);
      setShowMintFlow(true); // Fallback
    }
  };

  const handleStartFight = (mode: GameMode, p1: CharacterId, p2: CharacterId, difficulty: 'EASY' | 'HARD', rounds: number) => {
    setShowPreGameFlow(false);
    setIsGameStarted(true);
    // Tell Phaser to transition from Preloader to GameScene and pass config
    window.dispatchEvent(new CustomEvent('startGameScene', { detail: { mode, p1, p2, p1Name: username, difficulty, rounds } }));
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
    <main className="relative min-h-[120vh] w-full">
      {/* Loading Screen */}
      {isLoading && <LoadingScreen onComplete={handleLoadComplete} />}

      {/* Main Menu (Visible after load, before pre-game flow) */}
      {!isLoading && !isGameStarted && !isSpectating && !showPreGameFlow && !showMintFlow && !showLiveFights && !showMatchmaking && (
        <MainMenu 
          onStart={handleStartMenuClick}  
          onWatchLive={(matchData) => {
             if (matchData) {
                 setSpectatingMatch(matchData);
                 setIsSpectating(true);
             } else {
                 setShowLiveFights(true);
             }
          }}
          isMuted={isMuted} 
          onToggleMute={toggleMute} 
        />
      )}

      {/* Mint Fighter Flow (For new players without NFTs) */}
      {!isLoading && showMintFlow && (
        <MintFighterFlow 
          initialSelectedChar={initialMintChar || 'fighter'}
          playerName={username}
          onMintComplete={() => {
            setShowMintFlow(false);
            // Re-fetch logic or just immediately start flow with pessimistic update
            // For now, let's just go to PreGame flow, they might need to hit back/refresh to see it in owned array right now, 
            // but we can just append it to ownedChars manually for instant feedback:
            if (initialMintChar && !ownedChars.includes(initialMintChar)) {
                setOwnedChars(prev => [...prev, initialMintChar]);
            }
            setShowPreGameFlow(true);
          }}
          onBack={() => {
              setShowMintFlow(false);
              // If they were returning from PreGameFlow to mint, go back there
              if (ownedChars.length > 0) {
                  setShowPreGameFlow(true);
              }
          }}
        />
      )}

      {/* Pre-Game Flow (Mode and Character Selection) */}
      {!isLoading && showPreGameFlow && (
        <PreGameFlow 
          onStartFight={handleStartFight}
          onSearchOpponent={(charId) => {
             setMatchmakingP1Char(charId);
             setShowPreGameFlow(false);
             setShowMatchmaking(true);
          }}
          onBack={() => setShowPreGameFlow(false)}
          ownedCharacters={ownedChars}
          playerName={username}
          onMintNew={(charId) => {
             setInitialMintChar(charId);
             setShowPreGameFlow(false);
             setShowMintFlow(true);
          }}
        />
      )}

      {/* Matchmaking Screen */}
      {!isLoading && showMatchmaking && matchmakingP1Char && (
        <MatchmakingScreen
           playerName={username || 'Player'}
           charType={matchmakingP1Char}
           onCancel={() => {
               setShowMatchmaking(false);
               setShowPreGameFlow(true);
           }}
           onMatchFound={(matchData) => {
               setShowMatchmaking(false);
               
               if (matchData.role === 'P1') {
                   // Host Mode
                   setIsGameStarted(true);
                   window.dispatchEvent(new CustomEvent('startGameScene', { 
                       detail: { 
                           mode: 'PVP', 
                           p1: matchData.myChar, 
                           p2: matchData.opponentChar, 
                           p1Name: username, 
                           difficulty: 'HARD', 
                           rounds: 3,
                           isOnlineHost: true,
                           matchId: matchData.matchId
                       } 
                   }));
               } else {
                   // Client (Interactive Spectator) Mode
                   setSpectatingMatch({ ...matchData, isInteractiveClient: true, myName: username });
                   setIsSpectating(true);
               }
           }}
        />
      )}

      {/* Live Fights Flow */}
      {!isLoading && showLiveFights && (
        <LiveFightsFlow 
          onWatchMatch={(matchData) => {
             setShowLiveFights(false);
             setSpectatingMatch(matchData);
             setIsSpectating(true);
          }}
          onBack={() => setShowLiveFights(false)}
        />
      )}

      {/* Game Canvas (Always mounted so Preloader runs, but visually hidden until start) */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isGameStarted ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none -z-10'}`}>
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

      {/* Spectator Game Canvas */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isSpectating ? 'opacity-100 z-20' : 'opacity-0 pointer-events-none -z-20'}`}>
        {isSpectating && spectatingMatch && <SpectatorGameCanvasWrapper matchData={spectatingMatch} />}
        
        {isSpectating && (
          <button 
            onClick={() => {
                setIsSpectating(false);
                setSpectatingMatch(null);
                setShowLiveFights(true);
            }}
            className="absolute z-50 text-white/50 hover:text-white text-xs uppercase tracking-widest border border-white/10 px-3 py-1 bg-black/50 backdrop-blur-sm"
            style={{ top: 'max(1rem, env(safe-area-inset-top))', left: 'max(1rem, env(safe-area-inset-left))' }}
          >
            Leave Broadcast
          </button>
        )}
      </div>

      {/* Website Background Music (Stops when game starts) */}
      {!isGameStarted && !isSpectating && (
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
