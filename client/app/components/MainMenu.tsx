'use client';

interface MainMenuProps {
  onStart: () => void;
}

const MainMenu = ({ onStart }: MainMenuProps) => {
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

      {/* Menu Options */}
      <div className="flex flex-col gap-6 w-64">
        <button 
          onClick={onStart}
          className="group relative px-8 py-4 bg-transparent border border-gray-700 hover:border-shin-red transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-shin-red/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative z-10 font-cinzel text-xl tracking-widest group-hover:text-shin-red transition-colors flex items-center justify-center gap-2">
            <span>▶</span> PLAY NOW
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
          className="group relative px-8 py-3 bg-transparent border border-gray-800 hover:border-gray-500 transition-all duration-300 text-gray-500 hover:text-white"
        >
          <span className="font-cinzel text-sm tracking-widest">
            CONTROLS
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-gray-600 text-xs tracking-widest">
        v0.1.0 ALPHA
      </div>
    </div>
  );
};

export default MainMenu;
