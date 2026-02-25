import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface MatchData {
    matchId: string;
    hostName: string;
    p1Type: string;
    p2Type: string;
    mode: string;
    viewers: number;
}

interface LiveFightsFlowProps {
  onWatchMatch: (match: MatchData) => void;
  onBack: () => void;
}

const LiveFightsFlow: React.FC<LiveFightsFlowProps> = ({ onWatchMatch, onBack }) => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
     const wsUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001';
     const s = io(process.env.NEXT_PUBLIC_SERVER_URL || wsUrl);
     
     s.on('connect', () => {
         s.emit('get_active_matches');
     });

     s.on('active_matches_updated', (data: MatchData[]) => {
         // Filter out self or bad data if necessary, sort by viewer count descending
         const sorted = [...data].sort((a, b) => b.viewers - a.viewers);
         setMatches(sorted);
     });

     setSocket(s);

     return () => {
         s.disconnect();
     };
  }, []);

  return (
    <div className="absolute inset-0 z-40 bg-black text-white p-6 md:p-12 overflow-y-auto w-full h-full flex flex-col pt-24 pb-32">
        <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-gray-400 hover:text-white uppercase tracking-widest text-sm transition-colors border-b border-transparent hover:border-white font-cinzel font-bold"
        >
            ← Back
        </button>

        <h2 className="text-3xl md:text-5xl font-cinzel text-shin-gold mb-8 uppercase tracking-[0.2em] text-center drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            LIVE BROADCASTS
        </h2>

        {matches.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 font-cinzel uppercase tracking-widest">
                <span className="text-4xl mb-4 opacity-50">📡</span>
                <p>No active matches to watch right now.</p>
                <p className="text-sm mt-2 opacity-50">Start a match to begin broadcasting.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
                {matches.map(m => (
                    <div 
                        key={m.matchId}
                        onClick={() => onWatchMatch(m)}
                        className="bg-gray-900 border border-gray-700 hover:border-shin-gold p-6 cursor-pointer group transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:-translate-y-1 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] uppercase font-bold px-3 py-1.5 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                             LIVE
                        </div>
                        <h3 className="text-xl font-cinzel text-white mb-2 truncate pr-16">{m.hostName}'s Match</h3>
                        <p className="text-sm text-gray-400 uppercase tracking-widest mb-4">{m.mode} • {m.viewers} Viewers</p>
                        
                        <div className="flex justify-between items-center bg-black/50 p-3 rounded border border-gray-800">
                             <div className="text-center w-5/12">
                                 <span className="text-xs text-gray-500 block mb-1">Host</span>
                                 <span className="text-shin-red font-cinzel font-black uppercase truncate block tracking-widest">{m.p1Type}</span>
                             </div>
                             <div className="text-xl font-black text-gray-600 w-2/12 text-center font-cinzel">VS</div>
                             <div className="text-center w-5/12">
                                 <span className="text-xs text-gray-500 block mb-1">Target</span>
                                 <span className="text-blue-400 font-cinzel font-black uppercase truncate block tracking-widest">{m.p2Type}</span>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default LiveFightsFlow;
