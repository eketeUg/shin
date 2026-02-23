import React, { useState } from 'react';

export type GameMode = 'PVP' | 'PVE';
export type CharacterId = string;

interface PreGameFlowProps {
  onStartFight: (mode: GameMode, p1Character: CharacterId, p2Character: CharacterId) => void;
  onBack: () => void;
  ownedCharacters: string[];
}

export const Roster = [
  { id: 'fighter', name: 'Fighter', folder: 'Fighter', color: 'bg-orange-900 border-orange-500', frames: 6 },
  { id: 'knight_1', name: 'Knight', folder: 'Knight_1', color: 'bg-stone-700 border-stone-400', frames: 4 },
  { id: 'kunoichi', name: 'Kunoichi', folder: 'Kunoichi', color: 'bg-purple-900 border-purple-500', frames: 9 },
  { id: 'ninja_monk', name: 'Monk', folder: 'Ninja_Monk', color: 'bg-yellow-900 border-yellow-500', frames: 7 },
  { id: 'ninja_peasant', name: 'Peasant', folder: 'Ninja_Peasant', color: 'bg-green-900 border-green-500', frames: 6 },
  { id: 'samurai', name: 'Samurai V1', folder: 'Samurai', color: 'bg-red-900 border-red-500', frames: 6 },
  { id: 'samurai_1', name: 'Samurai V2', folder: 'Samurai_1', color: 'bg-rose-900 border-rose-500', frames: 6 },
  { id: 'samurai_archer', name: 'Archer', folder: 'Samurai_Archer', color: 'bg-teal-900 border-teal-500', frames: 9 },
  { id: 'samurai_commander', name: 'Commander', folder: 'Samurai_Commander', color: 'bg-amber-900 border-amber-500', frames: 5 },
  { id: 'shinobi', name: 'Shinobi', folder: 'Shinobi', color: 'bg-blue-900 border-blue-500', frames: 6 }
];

const PreGameFlow: React.FC<PreGameFlowProps> = ({ onStartFight, onBack, ownedCharacters }) => {
  const [step, setStep] = useState<'MODE_SELECT' | 'CHAR_SELECT'>('MODE_SELECT');
  const [mode, setMode] = useState<GameMode | null>(null);
  
  // Character Selection State
  const [p1Char, setP1Char] = useState<CharacterId | null>(null);
  const [p2Char, setP2Char] = useState<CharacterId | null>(null);

  const handleModeSelect = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setStep('CHAR_SELECT');
  };

  const handleCharacterClick = (charId: CharacterId) => {
    if (!p1Char) {
      setP1Char(charId);
      // In PvE, optionally auto-assign P2 or let P1 pick CPU character
      if (mode === 'PVE') {
         // Auto-assign random for now. 
         // Could let user pick, but let's keep it simple: random opponent
         const available = Roster.map(r => r.id as CharacterId);
         const randomChar = available[Math.floor(Math.random() * available.length)];
         setP2Char(randomChar);
      }
    } else if (!p2Char && mode === 'PVP') {
      setP2Char(charId);
    }
  };

  const handleFightClick = () => {
    if (mode && p1Char && p2Char) {
      onStartFight(mode, p1Char, p2Char);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/90 text-white backdrop-blur-md">
      <style>{`
        @keyframes playSpriteSheet {
          from { background-position: 0px 0px; }
          to { background-position: calc(var(--frames) * -96px) 0px; }
        }
      `}</style>
      {/* Back Button */}
      <button 
        onClick={() => {
          if (step === 'CHAR_SELECT') {
            setStep('MODE_SELECT');
            setP1Char(null);
            setP2Char(null);
          } else {
            onBack();
          }
        }}
        className="absolute top-8 left-8 text-shin-red hover:text-white uppercase tracking-widest text-sm transition-colors border-b border-transparent hover:border-shin-red font-cinzel font-bold"
      >
        ← Back
      </button>

      {/* MODE SELECT SCREEN */}
      {step === 'MODE_SELECT' && (
        <div className="w-full max-w-4xl px-4 animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-cinzel text-shin-gold mb-12 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              Select Game Mode
            </h2>
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full">
                {/* PvP Mode */}
                <button 
                    onClick={() => handleModeSelect('PVP')}
                    className="group relative flex flex-col items-center justify-center w-full md:w-1/2 overflow-hidden border border-gray-700 hover:border-shin-red bg-black/50 aspect-video max-h-64 transition-all duration-300"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-shin-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-3xl font-cinzel mb-2 group-hover:-translate-y-2 transition-transform duration-300 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">PLAYER VS PLAYER</span>
                    <span className="text-sm text-gray-400 group-hover:text-shin-red tracking-widest transition-colors duration-300 uppercase">Local Co-Op (Shared Screen)</span>
                </button>

                {/* PvE Mode */}
                <button 
                    onClick={() => handleModeSelect('PVE')}
                    className="group relative flex flex-col items-center justify-center w-full md:w-1/2 overflow-hidden border border-gray-700 hover:border-shin-gold bg-black/50 aspect-video max-h-64 transition-all duration-300"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-shin-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-3xl font-cinzel mb-2 group-hover:-translate-y-2 transition-transform duration-300 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">PLAYER VS CPU</span>
                    <span className="text-sm text-gray-400 group-hover:text-shin-gold tracking-widest transition-colors duration-300 uppercase">Single Player</span>
                </button>
            </div>
        </div>
      )}

      {/* CHARACTER SELECT SCREEN */}
      {step === 'CHAR_SELECT' && (
        <div className="w-full max-w-5xl px-4 animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center">
            <h2 className="text-4xl font-cinzel text-white mb-2 uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Choose Your Fighter</h2>
            <p className="text-shin-red tracking-widest uppercase mb-12 text-sm">
                {!p1Char ? "Player 1 Selection" : (mode === 'PVP' && !p2Char) ? "Player 2 Selection" : "Ready"}
            </p>

            {/* Roster Grid */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-12 w-full max-w-4xl">
                {Roster.map((char) => {
                    const isP1 = p1Char === char.id;
                    const isP2 = p2Char === char.id;
                    const isSelected = isP1 || isP2;
                    // In PvE, Player 1 can only pick owned chars. In PvP, Player 2 can pick anything for now (or also owned). 
                    // Let's restrict selection to just owned characters for Player 1, and for Player 2 if they are a real player choosing.
                    // For now, let's say the local player can only use characters from their own wallet.
                    const isOwned = ownedCharacters.includes(char.id) || mode === 'PVE' && p1Char && !p2Char; // Allow P2 to be anything in PvE if CPU auto-assign
                    // Wait, we auto-assign P2 in PvE anyway, so P2 won't be clicking.
                    // If mode is PVP, can P2 pick anything? Let's say yes for local co-op, or just restrict to P1's wallet. Let's restrict to wallet.
                    const canSelect = ownedCharacters.includes(char.id);

                    return (
                        <button
                            key={char.id}
                            disabled={isSelected || !canSelect} 
                            onClick={() => handleCharacterClick(char.id as CharacterId)}
                            className={`relative aspect-square border-2 flex flex-col items-center justify-end p-4 transition-all duration-300 ${
                                isSelected 
                                    ? char.color + ' opacity-100 scale-105 shadow-lg' 
                                    : canSelect
                                        ? 'bg-gray-900 border-gray-700 hover:border-gray-400 cursor-pointer opacity-80 hover:opacity-100'
                                        : 'bg-black border-gray-900 opacity-30 grayscale cursor-not-allowed'
                            }`}
                        >
                            {/* Character Idle Animation */}
                            <div 
                                className={`w-[96px] h-[96px] mb-auto mt-auto flex-shrink-0 scale-125 md:scale-150 origin-bottom`}
                                style={{
                                    backgroundImage: `url(/assets/sprites/${char.folder}/Idle.png)`,
                                    backgroundSize: `${char.frames * 100}% 100%`, // Width depends on number of frames
                                    animation: `playSpriteSheet 1s steps(${char.frames}) infinite`,
                                    imageRendering: 'pixelated',
                                    '--frames': char.frames
                                } as React.CSSProperties}
                            />
                            
                            <span className="font-cinzel text-xs md:text-sm uppercase tracking-widest text-white mt-4 z-10">{char.name}</span>
                            
                            {/* Selection Badges */}
                            {isP1 && <div className="absolute top-2 left-2 bg-shin-red text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest rounded-sm">P1</div>}
                            {isP2 && <div className="absolute top-2 right-2 bg-shin-gold text-black text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest rounded-sm">{mode === 'PVE' ? 'CPU' : 'P2'}</div>}
                            
                            {/* Locked Badge */}
                            {!canSelect && !isSelected && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-20">
                                  <span className="text-gray-500 font-cinzel text-xs tracking-widest border border-gray-600 px-2 py-1 bg-black/80">LOCKED</span>
                               </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected Versus Display */}
            <div className="flex items-center justify-center gap-8 mb-12 w-full">
                <div className="flex flex-col items-center w-32">
                    <span className="text-xs text-shin-red tracking-widest uppercase mb-2">P1</span>
                    <span className="font-cinzel text-xl text-white">{p1Char ? p1Char.toUpperCase() : "..."}</span>
                </div>
                
                <span className="text-4xl text-gray-500 font-cinzel italic tracking-widest mx-4">VS</span>
                
                <div className="flex flex-col items-center w-32">
                    <span className="text-xs text-shin-gold tracking-widest uppercase mb-2">{mode === 'PVE' ? 'CPU' : 'P2'}</span>
                    <span className="font-cinzel text-xl text-white">{p2Char ? p2Char.toUpperCase() : "..."}</span>
                </div>
            </div>

            {/* Fight Button */}
            {p1Char && p2Char && (
               <button 
                  onClick={handleFightClick}
                  className="px-16 py-4 bg-shin-red text-white font-cinzel font-black text-2xl tracking-[0.2em] border-2 border-transparent hover:border-white hover:bg-red-800 transition-all duration-300 animate-pulse hover:animate-none drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]"
               >
                 FIGHT!
               </button>
            )}
        </div>
      )}
    </div>
  );
};

export default PreGameFlow;
