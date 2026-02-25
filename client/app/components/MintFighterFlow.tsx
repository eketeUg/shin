import React, { useState } from 'react';
import { useUmi } from './UmiProvider';
import { create } from '@metaplex-foundation/mpl-core';
import { transferSol } from '@metaplex-foundation/mpl-toolbox';
import { generateSigner, sol, transactionBuilder, publicKey } from '@metaplex-foundation/umi';
import { CharacterId, Roster } from './PreGameFlow';

interface MintFighterFlowProps {
  onMintComplete: () => void;
  onBack: () => void;
  initialSelectedChar: CharacterId;
  playerName?: string;
}

// Helper to generate some fake generic stats based on class name length/chars
const generateStats = (id: string) => {
    let speed = 50 + (id.length * 3);
    let power = 80 - (id.length * 2);
    let defense = 40 + (id.charCodeAt(0) % 20) * 2;
    return { speed, power, defense };
};

const MintFighterFlow: React.FC<MintFighterFlowProps> = ({ onMintComplete, onBack, initialSelectedChar, playerName }) => {
  const [username, setUsername] = useState<string>(playerName || '');
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const umi = useUmi();
  
  const char = Roster.find(c => c.id === initialSelectedChar) || Roster[0];
  const stats = generateStats(char.id);

  const handleMint = async () => {
    if (!username.trim()) {
        setErrorMsg("Please enter a player name.");
        return;
    }

    try {
        setIsMinting(true);
        setErrorMsg(null);
        
        const assetName = char.name; // Fixed class name "Kunoichi"
        
        // Generate a new keypair for the NFT asset
        const asset = generateSigner(umi);

        console.log(`Minting ${assetName}...`);

        // ============================================
        // 💰 TREASURY WALLET SETUP
        // Send 0.05 SOL to the configured Treasury Wallet
        // Fallback to minter's own wallet if env var is missing (safe local testing)
        // ============================================
        const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET;
        const TREASURY_FEE_WALLET = treasuryAddress ? publicKey(treasuryAddress) : umi.identity.publicKey;

        // 1. Instruction: Transfer 0.05 SOL to Treasury
        const transferInstruction = transferSol(umi, {
            source: umi.identity,
            destination: TREASURY_FEE_WALLET,
            amount: sol(0.05),
        });

        // 2. Instruction: Create the Metaplex Core NFT
        const createInstruction = create(umi, {
            asset,
            name: assetName,
            uri: `https://shin-hazel.vercel.app/api/metadata/${char.id}`, // Placeholder URI
            plugins: [
                {
                    type: 'Attributes',
                    attributeList: [
                        { key: 'Player', value: username.trim() },
                        { key: 'Class', value: char.name },
                        { key: 'Power Level', value: '1' },
                        { key: 'Total Fights', value: '0' },
                        { key: 'Fights Won', value: '0' },
                        { key: 'Fights Lost', value: '0' }
                    ]
                }
            ]
        });

        // Combine both instructions into a single atomic transaction 
        // Either both succeed (funds paid & NFT minted), or both completely fail.
        const tx = await transactionBuilder()
            .add(transferInstruction)
            .add(createInstruction)
            .sendAndConfirm(umi);

        console.log("Mint successful!", tx);
        onMintComplete();
        
    } catch (e: any) {
        console.error("Mint failed:", e);
        setErrorMsg(e.message || "Transaction failed. Did you approve it?");
    } finally {
        setIsMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white backdrop-blur-xl p-4">
      {/* Back Button */}
      <button 
        onClick={onBack}
        disabled={isMinting}
        className="absolute top-6 left-6 text-gray-400 hover:text-white uppercase tracking-widest text-sm transition-colors border-b border-transparent hover:border-white font-cinzel font-bold disabled:opacity-50"
      >
        ← Back
      </button>

      <div className="w-full max-w-4xl flex flex-col md:flex-row landscape:flex-row items-center justify-center gap-4 md:gap-12 landscape:gap-4 animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh]">
        
        {/* Character Visuals */}
        <div className="flex flex-col items-center w-full md:w-1/2 landscape:w-1/2">
            <h2 className={`text-3xl md:text-5xl landscape:text-3xl font-cinzel font-black uppercase mb-2 md:mb-4 landscape:mb-2 ${char.color ? char.color.split(' ')[1].replace('border-', 'text-') : 'text-white'} drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`}>
                {char.name}
            </h2>
            <div className={`relative w-48 h-48 md:w-80 md:h-80 landscape:w-56 landscape:h-56 flex flex-col items-center justify-end p-4 border-2 bg-gray-900 border-gray-600 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] overflow-hidden mb-4 md:mb-8 landscape:mb-2`}>
                {/* Background Glow matching char color */}
                <div className={`absolute inset-0 opacity-20 ${char.color.split(' ')[0]} mix-blend-screen`}></div>
                
                <img 
                    src={`/assets/sprites/${char.folder}/AllActions.gif`}
                    alt={char.name}
                    className="w-[120px] h-[120px] md:w-[200px] md:h-[200px] landscape:w-[150px] landscape:h-[150px] object-contain mb-auto mt-auto flex-shrink-0 scale-[1.2] md:scale-150 origin-bottom transition-all duration-500 z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                    style={{ imageRendering: 'pixelated' }}
                />
            </div>
        </div>

        {/* Stats & Minting Form */}
        <div className="flex flex-col w-full md:w-1/2 landscape:w-1/2 bg-gray-900/50 border border-gray-800 p-4 md:p-8 landscape:p-4 pt-6 md:pt-10 landscape:pt-6 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-shin-gold to-transparent"></div>
            
            <h3 className="text-lg md:text-xl landscape:text-lg font-cinzel text-shin-gold mb-4 md:mb-6 landscape:mb-2 uppercase tracking-widest text-center border-b border-gray-800 pb-2 md:pb-4 landscape:pb-2">Class Attributes</h3>
            
            {/* Stats Bars (Fake/Visual) */}
            <div className="flex flex-col gap-2 md:gap-4 landscape:gap-2 mb-4 md:mb-8 landscape:mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-cinzel text-gray-400 uppercase tracking-widest w-24">Power</span>
                    <div className="flex-1 h-2 bg-gray-800 ml-4 overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${stats.power}%` }}></div>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-cinzel text-gray-400 uppercase tracking-widest w-24">Speed</span>
                    <div className="flex-1 h-2 bg-gray-800 ml-4 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${stats.speed}%` }}></div>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-cinzel text-gray-400 uppercase tracking-widest w-24">Defense</span>
                    <div className="flex-1 h-2 bg-gray-800 ml-4 overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${stats.defense}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="bg-black/50 p-2 md:p-4 landscape:p-2 border border-gray-800 mb-4 md:mb-8 landscape:mb-4">
                <p className="text-[10px] md:text-xs text-gray-400 font-sans leading-relaxed mb-2 text-center uppercase tracking-wider">
                   As you win battles, this tradable NFT's Power Level will permanently increase on the blockchain.
                </p>
                <div className="flex justify-between items-center text-xs md:text-sm font-cinzel text-shin-gold px-2 md:px-4">
                    <span>MINT COST:</span>
                    <span className="text-lg md:text-xl">0.05 SOL</span>
                </div>
            </div>

            <div className="flex flex-col gap-4 w-full">
                <input 
                    type="text" 
                    maxLength={15}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Player / Wielder Name"
                    disabled={isMinting || !!playerName}
                    className="w-full bg-black/80 border border-gray-700 text-white text-center text-lg px-4 py-3 font-cinzel focus:outline-none focus:border-shin-gold transition-colors placeholder:text-gray-600 disabled:opacity-50 disabled:text-shin-gold"
                />
                
                {errorMsg && <p className="text-red-500 text-sm font-bold animate-pulse text-center">{errorMsg}</p>}

                <button 
                    onClick={handleMint}
                    disabled={isMinting || !username.trim()}
                    className="w-full px-8 py-4 bg-shin-gold text-black font-cinzel font-black text-xl tracking-[0.2em] border-2 border-transparent hover:bg-yellow-500 hover:shadow-[0_0_15px_rgba(212,175,55,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-2"
                >
                    {isMinting ? (
                       <span className="animate-pulse">SIGNING TRANSACTION...</span>
                    ) : (
                       "+ MINT NFT"
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MintFighterFlow;
