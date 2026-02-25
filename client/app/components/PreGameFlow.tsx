import React, { useState } from 'react';

export type GameMode = 'PVP' | 'PVE';
export type CharacterId = string;

interface PreGameFlowProps {
  onStartFight: (mode: GameMode, p1Character: CharacterId, p2Character: CharacterId, difficulty: 'EASY' | 'HARD', rounds: number) => void;
  onSearchOpponent?: (p1Character: CharacterId) => void;
  onBack: () => void;
  ownedCharacters: string[];
  onMintNew: (charId: CharacterId) => void;
  playerName?: string;
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

const PreGameFlow: React.FC<PreGameFlowProps> = ({ onStartFight, onSearchOpponent, onBack, ownedCharacters, onMintNew, playerName }) => {
  const [step, setStep] = useState<'MODE_SELECT' | 'MATCH_CONFIG' | 'CHAR_SELECT'>('MODE_SELECT');
  const [mode, setMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<'EASY' | 'HARD'>('EASY');
  const [rounds, setRounds] = useState<number>(3);
  
  // Character Selection State
  const [p1Char, setP1Char] = useState<CharacterId | null>(null);
  const [p2Char, setP2Char] = useState<CharacterId | null>(null);
  const [activeTab, setActiveTab] = useState<'OWNED' | 'ALL' | 'LOCKED'>('ALL');

  const handleModeSelect = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setStep('MATCH_CONFIG');
  };

  const handleCharacterClick = (charId: CharacterId) => {
    if (!p1Char) {
      setP1Char(charId);
      // In PvE, optionally auto-assign P2 or let P1 pick CPU character
      if (mode === 'PVE') {
         // Auto-assign random CPU
         const available = Roster.map(r => r.id as CharacterId);
         const randomChar = available[Math.floor(Math.random() * available.length)];
         setP2Char(randomChar);
      } else if (mode === 'PVP' && onSearchOpponent) {
         // Online Multiplayer: Immediately trigger Matchmaking search with chosen character
         onSearchOpponent(charId);
      }
    } else if (!p2Char && mode === 'PVP') {
      setP2Char(charId);
    }
  };

  const handleFightClick = () => {
    if (mode && p1Char && p2Char) {
      onStartFight(mode, p1Char, p2Char, difficulty, rounds);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-start md:justify-center overflow-y-auto bg-black/90 text-white backdrop-blur-md py-20 md:py-8">
      {/* Back Button */}
      <button 
        onClick={() => {
          if (step === 'CHAR_SELECT') {
            setStep('MATCH_CONFIG');
            setP1Char(null);
            setP2Char(null);
          } else if (step === 'MATCH_CONFIG') {
            setStep('MODE_SELECT');
          } else {
            onBack();
          }
        }}
        className="fixed top-6 left-6 z-50 text-shin-red hover:text-white uppercase tracking-widest text-sm transition-colors border-b border-transparent hover:border-shin-red font-cinzel font-bold bg-black/50 md:bg-transparent px-2 py-1 rounded md:rounded-none"
      >
        ← Back
      </button>

      {/* MODE SELECT SCREEN */}
      {step === 'MODE_SELECT' && (
        <div className="w-full max-w-4xl px-4 animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-cinzel text-shin-gold mb-6 md:mb-12 landscape:mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] text-center">
              Select Game Mode
            </h2>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 landscape:gap-4 items-center justify-center w-full">
                {/* PvP Mode */}
                <button 
                    onClick={() => handleModeSelect('PVP')}
                    className="group relative flex flex-col items-center justify-center w-full md:w-1/2 overflow-hidden border border-gray-700 hover:border-shin-red bg-black/50 aspect-video max-h-64 transition-all duration-300"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-shin-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-3xl font-cinzel mb-2 group-hover:-translate-y-2 transition-transform duration-300 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] text-center">ONLINE MULTIPLAYER</span>
                    <span className="text-sm text-gray-400 group-hover:text-shin-red tracking-widest transition-colors duration-300 uppercase">Ranked Matchmaking</span>
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

      {/* MATCH CONFIG SCREEN */}
      {step === 'MATCH_CONFIG' && (
        <div className="w-full max-w-2xl px-4 animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
            <h2 className="text-4xl font-cinzel text-shin-gold mb-12 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] uppercase">
              Match Settings
            </h2>
            
            <div className="flex flex-col gap-12 w-full bg-black/50 border border-gray-800 p-8">
                {/* Difficulty (PvE Only) */}
                {mode === 'PVE' && (
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-cinzel mb-4 text-gray-300 tracking-widest uppercase">CPU Difficulty</h3>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setDifficulty('EASY')}
                                className={`px-8 py-3 font-cinzel font-bold text-lg tracking-widest border transition-all ${difficulty === 'EASY' ? 'bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-gray-700 hover:border-green-500/50 text-gray-500'}`}
                            >
                                EASY
                            </button>
                            <button 
                                onClick={() => setDifficulty('HARD')}
                                className={`px-8 py-3 font-cinzel font-bold text-lg tracking-widest border transition-all ${difficulty === 'HARD' ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-gray-700 hover:border-red-500/50 text-gray-500'}`}
                            >
                                HARD
                            </button>
                        </div>
                    </div>
                )}

                {/* Rounds */}
                <div className="flex flex-col items-center">
                    <h3 className="text-xl font-cinzel mb-4 text-gray-300 tracking-widest uppercase">Total Rounds</h3>
                    <div className="flex gap-2 md:gap-4 flex-wrap justify-center">
                        {[1, 2, 3, 4].map(r => (
                            <button 
                                key={r}
                                onClick={() => setRounds(r)}
                                className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center font-cinzel font-bold text-2xl transition-all border ${rounds === r ? 'bg-shin-gold/20 border-shin-gold text-shin-gold shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-110' : 'bg-black/80 border-gray-700 text-gray-500 hover:border-shin-gold/50 hover:text-gray-300 scale-100'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <span className="text-gray-500 text-xs mt-4 tracking-widest uppercase text-center max-w-sm">
                        Winner is the first to reach {Math.floor(rounds / 2) + 1} win{Math.floor(rounds / 2) + 1 > 1 ? 's' : ''}.
                    </span>
                </div>

                <div className="mt-8 mx-auto w-full flex justify-center border-t border-gray-800 pt-8">
                    <button 
                        onClick={() => setStep('CHAR_SELECT')}
                        className="px-12 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-black font-cinzel font-bold text-xl tracking-[0.2em] transition-all"
                    >
                        CONTINUE TO ROSTER
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* CHARACTER SELECT SCREEN */}
      {step === 'CHAR_SELECT' && (
        <div className="w-full max-w-5xl px-4 animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center">
            <h2 className="text-4xl font-cinzel text-white mb-2 uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Choose Your Fighter</h2>
            <p className="text-shin-red tracking-widest uppercase mb-12 text-sm">
                {!p1Char ? `${playerName || "Player 1"} Selection` : (mode === 'PVP' && !p2Char) ? "Player 2 Selection" : "Ready"}
            </p>

            {/* Render Character Grid Helper */}
            {(() => {
                const ownedRoster = Roster.filter(char => ownedCharacters.includes(char.id) || mode === 'PVE' && p1Char && !p2Char);
                const unownedRoster = Roster.filter(char => !ownedCharacters.includes(char.id) && !(mode === 'PVE' && p1Char && !p2Char));

                const renderCharacterButton = (char: typeof Roster[0], isOwned: boolean) => {
                    const isP1 = p1Char === char.id;
                    const isP2 = p2Char === char.id;
                    const isSelected = isP1 || isP2;
                    const canSelect = isOwned;

                    return (
                        <button
                            key={char.id}
                            disabled={isSelected} 
                            onClick={() => {
                                if (canSelect) {
                                    handleCharacterClick(char.id as CharacterId);
                                } else {
                                    onMintNew(char.id as CharacterId);
                                }
                            }}
                            className={`group relative aspect-square border-2 flex flex-col items-center justify-end p-4 transition-all duration-300 overflow-hidden ${
                                isSelected 
                                    ? char.color + ' opacity-100 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)] z-10' 
                                    : isOwned
                                        ? `bg-gray-900 border-gray-600 hover:${char.color.split(' ')[1]} cursor-pointer opacity-100 hover:scale-105 hover:z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]` // owned styling
                                        : 'bg-[#0a0a0a] border-gray-800 hover:border-shin-gold cursor-pointer transition-all opacity-100' // unowned styling
                            }`}
                        >
                            {/* Background Glow for Owned Characters */}
                            {isOwned && !isSelected && (
                                <div className={`absolute inset-0 opacity-20 ${char.color.split(' ')[0]} mix-blend-screen`}></div>
                            )}

                            {/* Character Animation */}
                            <img 
                                src={`/assets/sprites/${char.folder}/AllActions.gif`}
                                alt={char.name}
                                className={`w-[96px] h-[96px] object-contain mb-auto mt-auto flex-shrink-0 scale-125 md:scale-150 origin-bottom transition-all duration-500 z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}
                                style={{ imageRendering: 'pixelated' }}
                            />
                            
                            {/* Character Name */}
                            <div className="relative z-20 w-full text-center mt-4">
                                <span className={`font-cinzel text-xs md:text-sm uppercase tracking-widest ${isOwned ? 'text-white font-bold' : 'text-gray-400 group-hover:text-shin-gold'}`}>
                                    {char.name}
                                </span>
                            </div>
                            
                            {/* Selection Badges */}
                            {isP1 && <div className="absolute top-2 left-2 bg-shin-red text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest rounded-sm z-30 shadow-lg">P1</div>}
                            {isP2 && <div className="absolute top-2 right-2 bg-shin-gold text-black text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest rounded-sm z-30 shadow-lg">{mode === 'PVE' ? 'CPU' : 'P2'}</div>}
                            
                            {/* Unowned / Mint Badge Overlay */}
                            {!isOwned && !isSelected && (
                               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 group-hover:bg-black/30 backdrop-blur-[1px] group-hover:backdrop-blur-none transition-all duration-300 z-20">
                                  <div className="transform scale-95 group-hover:scale-100 transition-transform duration-300">
                                      <span className="text-shin-gold/70 group-hover:text-shin-gold font-cinzel text-xs md:text-sm tracking-widest border-y border-shin-gold/30 group-hover:border-shin-gold py-2 bg-black/40 group-hover:bg-shin-gold/20 transition-all font-bold group-hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] flex items-center gap-2 px-2">
                                         <span className="text-lg">+</span> MINT FIGHTER
                                      </span>
                                  </div>
                               </div>
                            )}

                            {/* Owned Badge */}
                            {isOwned && !isSelected && (
                                <div className="absolute top-2 right-2 z-20">
                                    <span className="text-[9px] text-green-400 border border-green-500/30 bg-green-500/10 px-1 rounded uppercase tracking-widest">Owned</span>
                                </div>
                            )}
                        </button>
                    );
                };

                return (
                    <div className="w-full max-w-5xl flex flex-col items-center gap-8 mb-12">
                        {/* ROSTER TABS */}
                        <div className="flex bg-black/50 border border-gray-800 p-1 mb-4 z-40">
                            {['ALL', 'OWNED', 'LOCKED'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as typeof activeTab)}
                                    className={`px-8 py-2 font-cinzel text-sm tracking-widest uppercase transition-all duration-300 ${activeTab === tab ? 'bg-shin-red text-white shadow-md' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {tab}
                                    {tab === 'OWNED' && <span className="ml-2 text-[10px] border border-gray-500 rounded px-1">{ownedRoster.length}</span>}
                                </button>
                            ))}
                        </div>

                        {/* OWNED FIGHTERS SECTION */}
                        {(activeTab === 'ALL' || activeTab === 'OWNED') && ownedRoster.length > 0 && (
                            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xl font-cinzel text-shin-gold text-center mb-6 drop-shadow-md">YOUR FIGHTERS</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 landscape:grid-cols-4 gap-4 justify-center">
                                    {ownedRoster.map(char => renderCharacterButton(char, true))}
                                </div>
                            </div>
                        )}

                        {/* DIVISION LINE (Only visible in ALL tab) */}
                        {activeTab === 'ALL' && ownedRoster.length > 0 && unownedRoster.length > 0 && (
                            <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-4"></div>
                        )}

                        {/* UNOWNED / AVAILABLE SECTION */}
                        {(activeTab === 'ALL' || activeTab === 'LOCKED') && unownedRoster.length > 0 && (
                            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xl font-cinzel text-gray-500 text-center mb-6">AVAILABLE TO MINT</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 landscape:grid-cols-4 gap-4 justify-center">
                                    {unownedRoster.map(char => renderCharacterButton(char, false))}
                                </div>
                            </div>
                        )}

                        {/* EMPTY STATE (e.g. if user is looking at OWNED tab but has no fighters) */}
                        {activeTab === 'OWNED' && ownedRoster.length === 0 && (
                            <div className="py-12 text-center text-gray-500 font-cinzel tracking-widest border border-gray-800 bg-gray-900/30 w-full animate-in fade-in duration-500">
                                YOU DO NOT OWN ANY FIGHTERS YET
                            </div>
                        )}
                        {activeTab === 'LOCKED' && unownedRoster.length === 0 && (
                            <div className="py-12 text-center text-shin-gold font-cinzel tracking-widest border border-shin-gold/30 bg-shin-gold/10 w-full animate-in fade-in duration-500">
                                YOU HAVE UNLOCKED THE ENTIRE ROSTER
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Selected Versus Display */}
            <div className="flex items-center justify-center gap-8 md:gap-16 mb-12 w-full">
                <div className="flex flex-col items-center w-48 md:w-64">
                    <span className="text-xs text-shin-red tracking-widest uppercase mb-4 z-20">{playerName ? (playerName.length > 7 ? playerName.substring(0, 7) + '...' : playerName) : 'P1'}</span>
                    <div className="relative h-48 w-48 md:h-64 md:w-64 flex items-end justify-center">
                        {p1Char ? (() => {
                            const p1Data = Roster.find(r => r.id === p1Char);
                            return p1Data ? (
                                <img 
                                    src={`/assets/sprites/${p1Data.folder}/idle.gif`} 
                                    className="w-full h-full object-contain scale-[1.0] md:scale-[2] landscape:scale-[1.5] md:landscape:scale-[2] origin-bottom animate-in fade-in zoom-in duration-500 transition-transform drop-shadow-[0_0_15px_rgba(255,51,51,0.5)]" 
                                    alt={p1Data.name} 
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            ) : null;
                        })() : (
                            <div className="h-full w-full border-4 border-dashed border-gray-800 rounded-full flex items-center justify-center opacity-50 animate-pulse">
                                <span className="font-cinzel text-lg text-gray-500">SELECT</span>
                            </div>
                        )}
                    </div>
                    <span className="font-cinzel text-xl text-white text-center mt-4 z-20">{p1Char ? p1Char.toUpperCase() : "..."}</span>
                </div>
                
                <span className="text-5xl md:text-7xl text-gray-600 font-cinzel italic tracking-widest mx-4 drop-shadow-lg z-20">VS</span>
                
                <div className="flex flex-col items-center w-48 md:w-64">
                    <span className="text-xs text-shin-gold tracking-widest uppercase mb-4 z-20">{mode === 'PVE' ? 'CPU' : 'OPPONENT'}</span>
                    <div className="relative h-48 w-48 md:h-64 md:w-64 flex items-end justify-center">
                        {p2Char ? (() => {
                            const p2Data = Roster.find(r => r.id === p2Char);
                            return p2Data ? (
                                <img 
                                    src={`/assets/sprites/${p2Data.folder}/idle.gif`} 
                                    className="w-full h-full object-contain scale-x-[-1.0] md:scale-x-[-2] scale-y-[1.0] md:scale-y-[2] landscape:scale-x-[-1.5] landscape:scale-y-[1.5] origin-bottom animate-in fade-in zoom-in duration-500 transition-transform drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" 
                                    alt={p2Data.name} 
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            ) : null;
                        })() : (
                            <div className="h-full w-full border-4 border-dashed border-gray-800 rounded-full flex items-center justify-center opacity-50 animate-pulse">
                                <span className="font-cinzel text-lg text-gray-500">WAITING</span>
                            </div>
                        )}
                    </div>
                    <span className="font-cinzel text-xl text-white text-center mt-4 z-20">{p2Char ? p2Char.toUpperCase() : "..."}</span>
                </div>
            </div>

            {/* Fight Button */}
            {p1Char && p2Char && (
               <button 
                  onClick={handleFightClick}
                  className="px-12 md:px-16 py-3 md:py-4 bg-shin-red text-white font-cinzel font-black text-xl md:text-2xl tracking-[0.2em] border-2 border-transparent hover:border-white hover:bg-red-800 transition-all duration-300 animate-pulse hover:animate-none drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]"
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
