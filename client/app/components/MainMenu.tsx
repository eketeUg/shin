import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useUmi } from './UmiProvider';
import { fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';

interface MainMenuProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const MainMenu = ({ onStart, isMuted, onToggleMute }: MainMenuProps) => {
  const [activeModal, setActiveModal] = useState<'controls' | 'about' | 'settings' | 'profile' | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [username, setUsername] = useState<string>('');
  
  const { connected, publicKey, disconnect, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const umi = useUmi();

  useEffect(() => {
    const verifyWallet = async () => {
      if (connected && publicKey && signMessage && !isVerified && !isSigning) {
        try {
          // Check cache first
          const cacheKey = `shin_auth_${publicKey.toString()}`;
          const cachedAuth = localStorage.getItem(cacheKey);
          
          // Try parsing cached username if we don't fetch one from chain
          if (cachedAuth) {
            const data = JSON.parse(cachedAuth);
            if (data.username) setUsername(data.username);
            setIsVerified(true);
          } else {
            setIsSigning(true);
            const message = new TextEncoder().encode(`Welcome to SHIN: The Struggle.\n\nPlease sign this message to verify wallet ownership.\nTimestamp: ${Date.now()}`);
            const signature = await signMessage(message);
            console.log("Wallet verified with signature:", bs58.encode(signature));
            
            setIsVerified(true);
            
            // Save proof of auth to prevent re-signing
            localStorage.setItem(cacheKey, JSON.stringify({ verified: true, signature: bs58.encode(signature) }));
          }

          // Fetch Metaplex Core Assets to check for existing Fighters
          try {
            const assets = await fetchAssetsByOwner(umi, umi.identity.publicKey);
            if (assets.length > 0) {
              const fullName = assets[0].name;
              const extractedName = fullName.split("'s")[0];
              if (extractedName && extractedName.length > 0) {
                setUsername(extractedName);
                
                // Update local storage cache
                const cachedAuth = JSON.parse(localStorage.getItem(cacheKey) || '{}');
                cachedAuth.username = extractedName;
                localStorage.setItem(cacheKey, JSON.stringify(cachedAuth));
              }
            }
          } catch (fetchErr) {
            console.error("Error fetching Core Assets:", fetchErr);
          }
          
        } catch (error) {
          console.error("Signature failed or rejected", error);
          disconnect();
        } finally {
          setIsSigning(false);
        }
      }
    };

    verifyWallet();
  }, [connected, publicKey, signMessage, isVerified, isSigning, disconnect]);




  const handlePlayClick = () => {
    if (!connected) {
      setVisible(true);
    } else if (!isVerified) {
       // Ideally the wallet modal is already popping up, but just in case:
       alert("Please check your wallet extension to sign the authentication message.");
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-sm">
      
      {/* Hero Section */}
      <div className="text-center mb-12 md:mb-16 animate-in fade-in zoom-in duration-1000 px-4">
        <h1 className="text-6xl md:text-8xl font-black font-cinzel text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          SHIN
        </h1>
        <h2 className="text-lg md:text-2xl text-shin-red tracking-[0.5em] md:tracking-[1em] uppercase mt-2 md:mt-4 font-light">
          The Struggle
        </h2>
      </div>

      {/* Wallet Status (Top Right) */}
      {connected && publicKey && isVerified && (
        <div className="absolute top-4 right-4 flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4 z-30 animate-in fade-in zoom-in duration-500">
          <button 
            className="flex items-center gap-2 text-xs font-cinzel text-shin-gold tracking-widest bg-black/50 px-3 py-1.5 border border-shin-gold/30 hover:border-shin-gold transition-colors backdrop-blur-sm cursor-default"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            {username ? username.toUpperCase() : `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`}
          </button>
          <button 
            onClick={() => {
              setUsername('');
              disconnect();
            }}
            className="text-xs font-cinzel text-gray-400 hover:text-shin-red tracking-widest transition-colors uppercase border border-white/10 px-3 py-1 bg-black/50 hover:border-shin-red/30 backdrop-blur-sm"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Menu Options */}
      <div className="flex flex-col gap-6 w-64">
        <button 
          onClick={handlePlayClick}
          className="group relative px-8 py-4 bg-transparent border border-gray-700 hover:border-shin-red transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-shin-red/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative z-10 font-cinzel text-xl tracking-widest group-hover:text-shin-red transition-colors flex items-center justify-center gap-2">
            <span>▶</span>
            <span>PLAY NOW</span>
          </span>
        </button>

        <button 
          className="group relative px-8 py-4 bg-transparent border border-gray-700 hover:border-shin-gold transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-shin-gold/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative z-10 font-cinzel text-lg tracking-widest group-hover:text-shin-gold transition-colors flex items-center justify-center gap-2">
            <span>👀</span> WATCH LIVE
          </span>
        </button>

        <button 
          onClick={() => setActiveModal('controls')}
          className="group relative px-8 py-3 bg-transparent border border-gray-800 hover:border-gray-500 transition-all duration-300 text-gray-500 hover:text-white"
        >
          <span className="font-cinzel text-sm tracking-widest">
            CONTROLS
          </span>
        </button>

        <button 
          onClick={() => setActiveModal('about')}
          className="group relative px-8 py-3 bg-transparent border border-gray-800 hover:border-gray-500 transition-all duration-300 text-gray-500 hover:text-white"
        >
          <span className="font-cinzel text-sm tracking-widest">
            ABOUT GAME
          </span>
        </button>

        <button 
          onClick={() => setActiveModal('settings')}
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
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-shin-red hover:text-white transition-colors"
            >
              ✕
            </button>

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
