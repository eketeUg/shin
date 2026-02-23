import React, { useState } from 'react';
import { useUmi } from './UmiProvider';
import { create } from '@metaplex-foundation/mpl-core';
import { generateSigner } from '@metaplex-foundation/umi';
import { CharacterId, Roster } from './PreGameFlow'; // We will export Roster from PreGameFlow in next step

interface MintFighterFlowProps {
  onMintComplete: () => void;
  onBack: () => void;
}

const MintFighterFlow: React.FC<MintFighterFlowProps> = ({ onMintComplete, onBack }) => {
  const [selectedChar, setSelectedChar] = useState<CharacterId | null>(null);
  const [username, setUsername] = useState<string>('');
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const umi = useUmi();

  const handleMint = async () => {
    if (!selectedChar || !username.trim()) {
        setErrorMsg("Choose a class and enter a name.");
        return;
    }

    try {
        setIsMinting(true);
        setErrorMsg(null);
        
        const characterClass = Roster.find(c => c.id === selectedChar)?.name || "Fighter";
        const assetName = `${username}'s ${characterClass}`;
        
        // Generate a new keypair for the NFT asset
        const asset = generateSigner(umi);

        console.log(`Minting ${assetName}...`);

        // Create the Metaplex Core NFT
        const tx = await create(umi, {
            asset,
            name: assetName,
            uri: `https://example.com/api/metadata/${selectedChar}`, // Placeholder URI, usually points to JSON
            // We can attach custom plugins for on-chain stats!
            plugins: [
                {
                    type: 'Attributes',
                    attributeList: [
                        { key: 'Class', value: selectedChar },
                        { key: 'Level', value: '1' },
                        { key: 'Matches_Played', value: '0' },
                        { key: 'Wins', value: '0' }
                    ]
                }
            ]
        }).sendAndConfirm(umi);

        console.log("Mint successful!", tx);
        
        // Update local cache to quickly reflect the new username without waiting for indexing
        if (umi.identity.publicKey) {
            const cacheKey = `shin_auth_${umi.identity.publicKey.toString()}`;
            const cachedAuth = JSON.parse(localStorage.getItem(cacheKey) || '{}');
            cachedAuth.username = username;
            localStorage.setItem(cacheKey, JSON.stringify(cachedAuth));
        }

        onMintComplete();
        
    } catch (e: any) {
        console.error("Mint failed:", e);
        setErrorMsg(e.message || "Transaction failed. Did you approve it?");
    } finally {
        setIsMinting(false);
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
      
      <button 
        onClick={onBack}
        disabled={isMinting}
        className="absolute top-8 left-8 text-shin-red hover:text-white uppercase tracking-widest text-sm transition-colors border-b border-transparent hover:border-shin-red font-cinzel font-bold disabled:opacity-50"
      >
        ← Back
      </button>

      <div className="w-full max-w-5xl px-4 animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center">
        <h2 className="text-4xl md:text-5xl font-cinzel text-shin-gold mb-2 uppercase drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
          Mint Your Champion
        </h2>
        <p className="text-gray-400 tracking-widest uppercase mb-12 text-sm">
          Select a base class to forge your NFT
        </p>

        {/* Roster Grid */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-8 w-full max-w-4xl">
            {Roster.map((char) => {
                const isSelected = selectedChar === char.id;
                return (
                    <button
                        key={char.id}
                        disabled={isMinting}
                        onClick={() => setSelectedChar(char.id)}
                        className={`relative aspect-square border-2 flex flex-col items-center justify-end p-4 transition-all duration-300 ${isSelected ? char.color + ' opacity-100 scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-gray-900 border-gray-800 hover:border-gray-500 cursor-pointer opacity-70 hover:opacity-100'} disabled:opacity-50`}
                    >
                        <div 
                            className={`w-[96px] h-[96px] mb-auto mt-auto flex-shrink-0 scale-125 md:scale-150 origin-bottom`}
                            style={{
                                backgroundImage: `url(/assets/sprites/${char.folder}/Idle.png)`,
                                backgroundSize: `${char.frames * 100}% 100%`,
                                animation: `playSpriteSheet 1s steps(${char.frames}) infinite`,
                                imageRendering: 'pixelated',
                                '--frames': char.frames
                            } as React.CSSProperties}
                        />
                        <span className="font-cinzel text-xs md:text-sm uppercase tracking-widest text-white mt-4 z-10">{char.name}</span>
                    </button>
                );
            })}
        </div>

        {/* Naming & Minting */}
        <div className="flex flex-col items-center w-full max-w-md gap-4">
            <input 
                type="text" 
                maxLength={15}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Character Name"
                disabled={isMinting || !selectedChar}
                className="w-full bg-black/50 border border-gray-700 text-white text-center text-xl px-4 py-4 font-cinzel focus:outline-none focus:border-shin-gold transition-colors placeholder:text-gray-700 disabled:opacity-50"
            />
            
            {errorMsg && <p className="text-red-500 text-sm font-bold animate-pulse">{errorMsg}</p>}

            <button 
                onClick={handleMint}
                disabled={isMinting || !selectedChar || !username.trim()}
                className="w-full px-8 py-4 bg-shin-gold text-black font-cinzel font-black text-xl tracking-[0.2em] border-2 border-transparent hover:bg-yellow-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {isMinting ? (
                   <span className="animate-pulse">Forging NFT on Solana...</span>
                ) : (
                   "MINT CHARACTER"
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MintFighterFlow;
