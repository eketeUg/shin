import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useUmi } from './UmiProvider';
import { fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';
import { useNetwork } from './Providers';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { io, Socket } from 'socket.io-client';

interface MainMenuProps {
  onStart: (username: string) => void;
  onWatchLive: (match?: any) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const MainMenu = ({ onStart, onWatchLive, isMuted, onToggleMute }: MainMenuProps) => {
  const [activeModal, setActiveModal] = useState<'controls' | 'about' | 'settings' | 'profile' | 'lobby' | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [solBalance, setSolBalance] = useState<number>(0);
  const [playBalance, setPlayBalance] = useState<number>(0);
  
  // Lobby State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  
  const { connected, publicKey, disconnect, signMessage } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const umi = useUmi();
  const { network, setNetwork } = useNetwork();

  const fetchAssets = async () => {
    try {
      // Background fetch to ensure assets are cached by Umi, we don't need to parse username from them anymore
      // since the username is now tied to the wallet profile.
      await fetchAssetsByOwner(umi, umi.identity.publicKey);
    } catch (fetchErr) {
      console.error("Error fetching Core Assets:", fetchErr);
    }
  };

  const playHoverSound = () => {
    if (isMuted) return;
    const audio = new Audio('/assets/audio/sfx/ui_hover.mp3');
    audio.volume = 0.2;
    audio.play().catch(e => console.log("Audio play blocked", e));
  };

  const playClickSound = () => {
    if (isMuted) return;
    const audio = new Audio('/assets/audio/sfx/ui_click.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play blocked", e));
  };

  useEffect(() => {
    const checkCache = async () => {
      if (connected && publicKey && signMessage && !isVerified && !isSigning) {
        // Check cache first
        const cacheKey = `shin_auth_${publicKey.toString()}`;
        const cachedAuth = localStorage.getItem(cacheKey);
        
        if (cachedAuth) {
          const data = JSON.parse(cachedAuth);
          if (data.username) setUsername(data.username);
          setIsVerified(true);
          await fetchAssets();
        }
      }
    };

    checkCache();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, signMessage, isVerified, isSigning, disconnect]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (connected && isVerified && publicKey) {
        try {
          // Fetch SOL
          const balance = await connection.getBalance(publicKey);
          setSolBalance(balance / LAMPORTS_PER_SOL);

          // Fetch PLAY on Mainnet
          if (network === WalletAdapterNetwork.Mainnet) {
            const PLAY_MINT = new PublicKey('PLAYs3GSSadH2q2JLS7djp7yzeT75NK78XgrE5YLrfq');
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: PLAY_MINT });
            if (tokenAccounts.value.length > 0) {
              const amount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
              setPlayBalance(amount || 0);
            } else {
              setPlayBalance(0);
            }
          } else {
            setPlayBalance(0);
          }
        } catch (err) {
          console.error("Error fetching balances:", err);
        }
      }
    };
    fetchBalances();
  }, [connected, isVerified, publicKey, connection, network]);

  // Lobby Socket Management
  useEffect(() => {
    let newSocket: Socket | null = null;
    if (activeModal === 'lobby') {
       const wsUrl = process.env.NEXT_PUBLIC_SERVER_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001');
       const customPath = wsUrl.includes('/shin') ? '/shin/socket.io' : '/socket.io';
       newSocket = io(wsUrl, { path: customPath });
       setSocket(newSocket);

       newSocket.on('connect', () => {
           console.log("Connected to match server for lobby info");
           newSocket?.emit('get_active_matches');
       });

       newSocket.on('active_matches_updated', (matches: any[]) => {
           setActiveMatches(matches);
       });
    } else {
       if (socket) {
           socket.disconnect();
           setSocket(null);
       }
    }

    return () => {
        if (newSocket) newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal]);

  const handlePlayClick = async () => {
    if (!connected || !publicKey || !signMessage) {
      setVisible(true);
    } else if (!isVerified) {
       setIsSigning(true);
       try {
         const message = new TextEncoder().encode(`Welcome to SHIN: The Struggle.\n\nPlease sign this message to verify wallet ownership.\nTimestamp: ${Date.now()}`);
         const signature = await signMessage(message);
         console.log("Wallet verified with signature:", bs58.encode(signature));
         
         setIsVerified(true);
         
         const cacheKey = `shin_auth_${publicKey.toString()}`;
         const cachedAuth = JSON.parse(localStorage.getItem(cacheKey) || '{}');
         cachedAuth.verified = true;
         cachedAuth.signature = bs58.encode(signature);
         localStorage.setItem(cacheKey, JSON.stringify(cachedAuth));
         
         await fetchAssets();
         
         // 1. Fetch from Database to see if they've registered before
         try {
             const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'}/api/users/${publicKey.toString()}`);
             if (res.ok) {
                 const userData = await res.json();
                 if (userData.userName) {
                     cachedAuth.username = userData.userName;
                     localStorage.setItem(cacheKey, JSON.stringify(cachedAuth));
                 }
             }
         } catch (e) {
             console.error("Failed to fetch user from DB:", e);
         }
         
         if (cachedAuth.username) {
            setUsername(cachedAuth.username);
            onStart(cachedAuth.username);
         } else {
            setActiveModal('profile');
         }
       } catch (error) {
         console.error("Signature failed or rejected", error);
       } finally {
         setIsSigning(false);
       }
    } else {
       if (username) {
           onStart(username);
       } else {
           setIsSigning(true);
           try {
               const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'}/api/users/${publicKey.toString()}`);
               if (res.ok) {
                   const userData = await res.json();
                   if (userData.userName) {
                       setUsername(userData.userName);
                       onStart(userData.userName);
                       return;
                   }
               }
           } catch (e) {
               console.error("Failed to fetch user:", e);
           } finally {
               setIsSigning(false);
           }
           setActiveModal('profile');
       }
    }
  };

  const handleSaveProfile = async () => {
      playClickSound();
      if (!username.trim() || !publicKey) return;
      
      const newUsername = username.trim();
      const walletAddress = publicKey.toString();

      setIsSigning(true);
      try {
          await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'}/api/users`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ walletAddress, userName: newUsername })
          });
      } catch (e) {
          console.error("Failed to save profile to DB:", e);
      } finally {
          setIsSigning(false);
      }
      
      const cacheKey = `shin_auth_${walletAddress}`;
      const cachedAuth = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      cachedAuth.username = newUsername;
      localStorage.setItem(cacheKey, JSON.stringify(cachedAuth));
      
      setActiveModal(null);
      onStart(newUsername);
  };

  return (
    <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-sm">
      
      {/* Hero Section */}
      <div className="text-center mb-6 md:mb-16 landscape:mb-2 animate-in fade-in zoom-in duration-1000 px-4 mt-16 md:mt-0 landscape:mt-2">
        <h1 className="text-5xl md:text-8xl landscape:text-5xl font-black font-cinzel text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none">
          SHIN
        </h1>
        <h2 className="text-sm md:text-2xl landscape:text-xs text-shin-red tracking-[0.5em] md:tracking-[1em] uppercase mt-1 md:mt-4 font-light">
          The Struggle
        </h2>
      </div>

      {/* Wallet Status & Network (Top Right) */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-1 md:gap-2 z-30 animate-in fade-in zoom-in duration-500 scale-90 md:scale-100 origin-top-right">
        
        {/* Network Toggle */}
        <div className="flex bg-black/50 border border-white/20 p-1 backdrop-blur-sm">
          <button 
            onClick={() => setNetwork(WalletAdapterNetwork.Mainnet)}
            className={`px-3 py-1 text-xs font-cinzel tracking-widest transition-colors ${network === WalletAdapterNetwork.Mainnet ? 'bg-shin-red text-white' : 'text-gray-400 hover:text-white'}`}
          >
            MAINNET
          </button>
          <button 
            onClick={() => setNetwork(WalletAdapterNetwork.Devnet)}
            className={`px-3 py-1 text-xs font-cinzel tracking-widest transition-colors ${network === WalletAdapterNetwork.Devnet ? 'bg-shin-red text-white' : 'text-gray-400 hover:text-white'}`}
          >
            DEVNET
          </button>
        </div>

        {connected && publicKey && isVerified && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-cinzel text-shin-gold tracking-widest bg-black/50 px-3 py-1.5 border border-shin-gold/30 backdrop-blur-sm cursor-default">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {publicKey.toString()}
            </div>
            
            <div className="flex gap-2 text-xs font-mono text-gray-300">
              <span className="bg-black/50 px-2 py-1 border border-white/10">{solBalance.toFixed(2)} SOL</span>
              {network === WalletAdapterNetwork.Mainnet && (
                <span className="bg-black/50 px-2 py-1 border border-white/10 text-cyan-400">{playBalance.toLocaleString()} PLAY</span>
              )}
            </div>

            <button 
              onClick={() => {
                setUsername('');
                setIsVerified(false);
                disconnect();
              }}
              className="text-xs font-cinzel text-gray-400 hover:text-shin-red tracking-widest transition-colors uppercase mt-1"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Menu Options */}
      <div className="grid grid-cols-1 landscape:grid-cols-2 lg:flex lg:flex-col lg:w-64 gap-3 md:gap-6 w-11/12 max-w-sm landscape:max-w-xl lg:max-w-none mx-auto landscape:mx-0">
        
        {(!connected || !isVerified) && (
          <button 
            onClick={!connected ? () => { playClickSound(); setVisible(true); } : () => { playClickSound(); handlePlayClick(); }}
            onMouseEnter={playHoverSound}
            className={`group relative px-4 md:px-8 py-3 md:py-4 bg-shin-red/20 border transition-all duration-300 overflow-hidden ${isSigning ? 'border-gray-500 opacity-50 cursor-wait' : 'border-shin-red hover:bg-shin-red/40'} landscape:col-span-2 lg:landscape:col-span-1`}
            disabled={isSigning}
          >
            <span className="relative z-10 font-cinzel text-sm md:text-xl tracking-widest text-white flex items-center justify-center gap-2">
              {isSigning ? "WAITING..." : !connected ? "CONNECT WALLET" : "SIGN WALLET"}
            </span>
          </button>
        )}

        <button 
          onClick={() => { playClickSound(); handlePlayClick(); }}
          onMouseEnter={playHoverSound}
          disabled={!connected || !isVerified}
          className={`group relative px-4 md:px-8 py-3 md:py-4 bg-transparent border border-gray-700 transition-all duration-300 overflow-hidden ${(!connected || !isVerified) ? 'opacity-30 cursor-not-allowed' : 'hover:border-shin-red'}`}
        >
          {connected && isVerified && <div className="absolute inset-0 bg-shin-red/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>}
          <span className={`relative z-10 font-cinzel text-sm md:text-xl tracking-widest flex items-center justify-center gap-2 ${connected && isVerified ? 'group-hover:text-shin-red text-white' : 'text-gray-500'}`}>
            <span>▶</span>
            <span>PLAY NOW</span>
          </span>
        </button>

        <button 
          onClick={() => { playClickSound(); setActiveModal('lobby'); }}
          onMouseEnter={playHoverSound}
          className="group relative px-4 md:px-8 py-3 md:py-4 bg-transparent border border-gray-700 hover:border-shin-gold transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-shin-gold/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative z-10 font-cinzel text-sm md:text-lg tracking-widest group-hover:text-shin-gold transition-colors flex items-center justify-center gap-2">
            <span>👀</span> WATCH LIVE
          </span>
        </button>

        <button 
          onClick={() => { playClickSound(); setActiveModal('controls'); }}
          onMouseEnter={playHoverSound}
          className="group relative px-8 py-3 bg-transparent border border-gray-800 hover:border-gray-500 transition-all duration-300 text-gray-500 hover:text-white"
        >
          <span className="font-cinzel text-sm tracking-widest">
            CONTROLS
          </span>
        </button>

        <button 
          onClick={() => { playClickSound(); setActiveModal('about'); }}
          onMouseEnter={playHoverSound}
          className="group relative px-8 py-3 bg-transparent border border-gray-800 hover:border-gray-500 transition-all duration-300 text-gray-500 hover:text-white"
        >
          <span className="font-cinzel text-sm tracking-widest">
            ABOUT GAME
          </span>
        </button>

        <button 
          onClick={() => { playClickSound(); setActiveModal('settings'); }}
          onMouseEnter={playHoverSound}
          className="group relative px-8 py-3 bg-transparent border border-gray-800 hover:border-gray-500 transition-all duration-300 text-gray-500 hover:text-white"
        >
          <span className="font-cinzel text-sm tracking-widest">
            SETTINGS
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 md:bottom-8 text-gray-600 text-xs tracking-widest">
        v0.1.0 ALPHA
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-black border border-shin-red rounded-xl p-6 md:p-8 max-w-md w-full relative animate-in zoom-in-95 duration-200 shadow-[0_0_15px_rgba(255,0,0,0.3)]">
            {/* Close Button */}
            {activeModal !== 'profile' && (
              <button 
                onClick={() => { playClickSound(); setActiveModal(null); }}
                className="absolute top-4 right-4 text-shin-red hover:text-white transition-colors"
                title="Close"
              >
                ✕
              </button>
            )}

            {/* Profile Setup Modal */}
            {activeModal === 'profile' && (
              <div className="flex flex-col items-center">
                <h2 className="text-3xl font-cinzel text-shin-gold mb-2 uppercase drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                  Fighter Profile
                </h2>
                <p className="text-gray-400 text-sm text-center mb-8 uppercase tracking-widest">
                  Enter the name that will strike fear into your opponents. This name will be permanently attached to your wallet for the arena.
                </p>
                <div className="w-full flex flex-col gap-4">
                  <input 
                      type="text" 
                      maxLength={15}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full bg-black/50 border border-gray-700 text-white text-center text-xl px-4 py-4 font-cinzel focus:outline-none focus:border-shin-gold transition-colors placeholder:text-gray-700"
                  />
                  <button 
                      onClick={handleSaveProfile}
                      disabled={!username.trim()}
                      className="w-full px-8 py-4 bg-shin-gold text-black font-cinzel font-black text-lg tracking-[0.2em] hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      ENTER ARENA
                  </button>
                </div>
              </div>
            )}

            {/* Matchmaking Lobby Modal */}
            {activeModal === 'lobby' && (
              <div className="flex flex-col max-h-[80vh] landscape:max-h-[85vh]">
                <h2 className="text-2xl font-cinzel text-shin-gold mb-6 uppercase drop-shadow-md flex items-center justify-between">
                  <span>Live Arena Features</span>
                  <div className="flex items-center gap-2 text-sm text-red-500 font-bold tracking-widest bg-red-500/10 px-3 py-1 border border-red-500/30 rounded-full">
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                     LIVE
                  </div>
                </h2>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {activeMatches.length === 0 ? (
                        <div className="text-center text-gray-500 font-cinzel tracking-widest py-8 border border-gray-800 bg-gray-900/30">
                            NO ACTIVE MATCHES
                        </div>
                    ) : (
                        activeMatches.map((match, idx) => (
                            <div key={idx} className="group flex flex-col md:flex-row items-center justify-between bg-black/60 border border-gray-800 hover:border-shin-gold/50 p-4 transition-all duration-300">
                                <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto overflow-hidden">
                                     <div className="flex flex-col items-center flex-shrink-0">
                                          <img src={`/assets/sprites/${match.p1Type}/idle.gif`} className="w-12 h-12 object-contain" alt="P1" />
                                          <span className="text-[10px] text-gray-400 mt-1 uppercase max-w-[80px] truncate">{match.hostName}</span>
                                     </div>
                                     <span className="text-shin-red font-cinzel font-bold text-xl drop-shadow-[0_0_5px_rgba(255,0,0,0.8)] mx-2">VS</span>
                                     <div className="flex flex-col items-center flex-shrink-0">
                                          <img src={`/assets/sprites/${match.p2Type}/idle.gif`} className="w-12 h-12 object-contain transform -scale-x-100" alt="P2" />
                                          <span className="text-[10px] text-gray-400 mt-1 uppercase max-w-[80px] truncate">{match.mode.includes('PvE') ? 'CPU' : 'Challenger'}</span>
                                     </div>
                                </div>
                                
                                <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto">
                                    <div className="flex flex-wrap justify-center md:justify-end gap-2 text-xs">
                                        <span className="bg-gray-800 px-2 py-1 text-gray-300">{match.mode}</span>
                                        <span className="bg-blue-900/30 border border-blue-500/30 text-blue-400 px-2 py-1 flex items-center gap-1">
                                            <span className="text-[10px]">👁</span> {match.viewers} Viewers
                                        </span>
                                        <span className="bg-shin-gold/10 border border-shin-gold/30 text-shin-gold px-2 py-1 font-mono">
                                            {match.encryptedWagers?.length || 0} Wagers
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => { playClickSound(); onWatchLive(match); }}
                                        className="w-full md:w-auto px-6 py-2 bg-transparent border border-gray-500 hover:border-white text-white font-cinzel tracking-widest text-sm transition-colors group-hover:bg-white/10"
                                    >
                                        SPECTATE
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
              </div>
            )}

            {/* Controls Modal */}
            {activeModal === 'controls' && (
              <div>
                <h2 className="text-2xl font-cinzel text-shin-red mb-4">Controls</h2>
                <div className="space-y-4 text-gray-300 text-sm">
                  <div className="flex justify-between items-center border-b border-shin-red/30 pb-2">
                    <span className="font-bold text-white">Joystick</span>
                    <span>Movement (Left/Right) & Jump (Up)</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-shin-red/30 pb-2">
                    <span className="font-bold text-red-500">A Button</span>
                    <span>Attack (Combo 1-3)</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-shin-red/30 pb-2">
                    <span className="font-bold text-yellow-500">B Button</span>
                    <span>Jump</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-shin-red/30 pb-2">
                    <span className="font-bold text-green-500">Y Button</span>
                    <span>Block (Hold)</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                    <span className="font-bold text-blue-500">X Button</span>
                    <span>Skill (Unmapped)</span>
                  </div>
                </div>
              </div>
            )}

            {/* About Modal */}
            {activeModal === 'about' && (
              <div>
                <h2 className="text-2xl font-cinzel text-shin-red mb-4">About Game</h2>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  <strong>SHIN: The Struggle</strong> is a 2D PvP fighting game inspired by Igbo folklore and culture. 
                  Players face off in intense 1v1 combat, utilizing combos, precise timing, and blocks to defeat their opponents before the 99-second timer runs out.
                </p>
                <p className="text-shin-red/70 text-xs italic">Developed for Hackathon 2026.</p>
              </div>
            )}



            {/* Settings Modal */}
            {activeModal === 'settings' && (
              <div>
                <h2 className="text-2xl font-cinzel text-shin-red mb-6">Settings</h2>
                <div className="space-y-6">
                  {/* Audio Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">Audio Effects</div>
                      <div className="text-shin-red/70 text-xs text-left">Mute or turn on sound</div>
                    </div>
                    <button 
                      onClick={onToggleMute}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!isMuted ? 'bg-shin-red' : 'bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isMuted ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Transaction Toggle */}
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <div className="text-white font-bold">Show Transactions</div>
                      <div className="text-shin-red/70 text-xs text-left">Web3 Feature Toggle</div>
                    </div>
                    <button 
                      onClick={() => setShowTransactions(!showTransactions)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showTransactions ? 'bg-shin-red' : 'bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showTransactions ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
