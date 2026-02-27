import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { 
    AddEntity, 
    InitializeComponent, 
    ApplySystem, 
    FindWorldPda, 
    FindEntityPda, 
    BN 
} from '@magicblock-labs/bolt-sdk';

interface MatchmakingScreenProps {
    playerName: string;
    charType: string;
    onMatchFound: (matchData: any) => void;
    onCancel: () => void;
}

// Config
const WORLD_ID = new BN(1);
const WORLD_PROGRAM_ID = new PublicKey("WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n");
const MATCHMAKING_SYSTEM_ID = new PublicKey("CquhFpBB3YpNeWtWTip558qCURivhmXTYEZZgG6xVP5C");
const GAME_MATCH_COMPONENT_ID = new PublicKey("HdhmVpcigj5BRmECsnTR5m6rpCJfawNEUs4d5XyALeZF");
const POSITION_COMPONENT_ID = new PublicKey("GJp9uPK4xzU9vbobTvwJbGUPrRgUZXr1vbf7Fv6ePf58");
const HEALTH_COMPONENT_ID = new PublicKey("3ZzeR3FP7Bur8rpdB48WurX7EYvf3Cnzp3cHKz7kAvrx");
const COMBAT_STATE_COMPONENT_ID = new PublicKey("9A5fzxAgfpjsVVVKqEAqGYb2W6DuQjNwci1WneryCbza");

const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({ playerName, charType, onMatchFound, onCancel }) => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [status, setStatus] = useState<string>("Connecting to MagicBlock ER...");

    useEffect(() => {
        let isCancelled = false;
        
        const startMatchmaking = async () => {
            if (!publicKey) {
                setStatus("Please connect your wallet!");
                return;
            }

            try {
                // 1. Find World Pda
                const worldPda = FindWorldPda({ worldId: WORLD_ID });
                setStatus("Searching for Match Entity...");

                // 2. Add Match Entity
                const matchSeed = new Uint8Array(Buffer.from(`match-${Date.now()}`));
                const { transaction: addEntityTx, entityPda } = await AddEntity({
                    payer: publicKey,
                    world: worldPda,
                    connection,
                    seed: matchSeed
                });
                
                setStatus("Initializing Entity on L2...");
                await sendTransaction(addEntityTx, connection);
                if (isCancelled) return;

                // 3. Initialize all components (Match, P1 Position/Health/State, P2 Position/Health/State)
                // In a real game, some of these would be in separate transacitons or combined if possible.
                // For simplicity, we initialize them sequentially here.
                
                const componentsToInit = [
                    { id: GAME_MATCH_COMPONENT_ID, seed: undefined },
                    { id: POSITION_COMPONENT_ID, seed: "p1" },
                    { id: POSITION_COMPONENT_ID, seed: "p2" },
                    { id: HEALTH_COMPONENT_ID, seed: "p1" },
                    { id: HEALTH_COMPONENT_ID, seed: "p2" },
                    { id: COMBAT_STATE_COMPONENT_ID, seed: "p1" },
                    { id: COMBAT_STATE_COMPONENT_ID, seed: "p2" },
                ];

                for (const comp of componentsToInit) {
                    setStatus(`Initializing ${comp.seed || 'Match'} Component...`);
                    const { transaction } = await InitializeComponent({
                        payer: publicKey,
                        entity: entityPda,
                        componentId: comp.id,
                        seed: comp.seed
                    });
                    await sendTransaction(transaction, connection);
                    if (isCancelled) return;
                }

                // 4. Dispatch Matchmaking System
                const { transaction: applySystemTx } = await ApplySystem({
                    authority: publicKey,
                    systemId: MATCHMAKING_SYSTEM_ID,
                    world: worldPda,
                    entities: [
                        {
                            entity: entityPda,
                            components: [{ componentId: GAME_MATCH_COMPONENT_ID }]
                        }
                    ]
                });

                setStatus("Match initialized on Ephemeral Rollup!");
                await sendTransaction(applySystemTx, connection);
                if (isCancelled) return;

                // 5. Done!
                onMatchFound({
                    matchId: entityPda.toBase58(),
                    isHost: true,
                    p1Type: charType,
                    p2Type: 'samurai'
                });

            } catch (err: any) {
                console.error("Matchmaking error:", err);
                setStatus(`Error: ${err.message || "Transaction failed"}`);
            }
        };
        
        startMatchmaking();

        return () => {
            isCancelled = true;
        };
    }, [publicKey, connection, sendTransaction, playerName, charType, onMatchFound]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white backdrop-blur-md">
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-t-shin-red border-r-shin-gold border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <div className="absolute top-2 left-2 right-2 bottom-2 border-4 border-t-transparent border-r-transparent border-b-shin-gold border-l-shin-red rounded-full animate-spin-slow reverse"></div>
                    <span className="text-4xl text-white drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">VS</span>
                </div>
                
                <h2 className="text-3xl font-cinzel text-shin-gold mb-2 uppercase drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse tracking-widest text-center">
                    MagicBlock Rollup
                </h2>
                
                <p className="text-gray-400 font-mono text-sm tracking-widest mb-12 uppercase text-center max-w-md">
                    {status}
                </p>

                <button 
                    onClick={onCancel}
                    className="px-8 py-3 bg-transparent border border-gray-600 hover:border-shin-red hover:text-shin-red transition-all text-gray-400 font-cinzel tracking-widest text-sm uppercase"
                >
                    Cancel Matchmaking
                </button>
            </div>
        </div>
    );
};

export default MatchmakingScreen;
