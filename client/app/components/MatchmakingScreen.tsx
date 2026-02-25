import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface MatchmakingScreenProps {
    playerName: string;
    charType: string;
    onMatchFound: (matchData: any) => void;
    onCancel: () => void;
}

const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({ playerName, charType, onMatchFound, onCancel }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const wsUrl = process.env.NEXT_PUBLIC_SERVER_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001');
        const customPath = wsUrl.includes('/shin') ? '/shin/socket.io' : '/socket.io';
        const s = io(wsUrl, { path: customPath });
        setSocket(s);

        s.on('connect', () => {
            console.log("Connected to Matchmaking Server...");
            s.emit('join_matchmaking', { username: playerName, charType });
        });

        s.on('match_found', (data: any) => {
            console.log("Match found!", data);
            // Wait a brief moment for dramatic effect
            setTimeout(() => {
                onMatchFound(data);
                s.disconnect();
            }, 1000);
        });

        return () => {
            s.emit('cancel_matchmaking');
            s.disconnect();
        };
    }, [playerName, charType, onMatchFound]);

    const handleCancel = () => {
        if (socket) {
            socket.emit('cancel_matchmaking');
            socket.disconnect();
        }
        onCancel();
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white backdrop-blur-md">
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-t-shin-red border-r-shin-gold border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <div className="absolute top-2 left-2 right-2 bottom-2 border-4 border-t-transparent border-r-transparent border-b-shin-gold border-l-shin-red rounded-full animate-spin-slow reverse"></div>
                    <span className="text-4xl text-white drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">VS</span>
                </div>
                
                <h2 className="text-3xl font-cinzel text-shin-gold mb-2 uppercase drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse tracking-widest">
                    Searching for Opponent
                </h2>
                
                <p className="text-gray-400 font-mono text-sm tracking-widestuppercase mb-12">
                    {charType.toUpperCase()} queued...
                </p>

                <button 
                    onClick={handleCancel}
                    className="px-8 py-3 bg-transparent border border-gray-600 hover:border-shin-red hover:text-shin-red transition-all text-gray-400 font-cinzel tracking-widest text-sm uppercase"
                >
                    Cancel Matchmaking
                </button>
            </div>
        </div>
    );
};

export default MatchmakingScreen;
