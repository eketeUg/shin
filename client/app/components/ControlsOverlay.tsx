'use client';

import { useEffect, useRef, useState } from 'react';

const ControlsOverlay = () => {
    // Joystick State
    const joystickRef = useRef<HTMLDivElement>(null);
    const [joystickActive, setJoystickActive] = useState(false);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const joyStartPos = useRef({ x: 0, y: 0 });

    // Health State
    const [p1Health, setP1Health] = useState({ hp: 100, maxHp: 100 });
    const [p2Health, setP2Health] = useState({ hp: 100, maxHp: 100 });
    
    // Match Timer State
    const [matchTime, setMatchTime] = useState(99);

    // Game Over State
    const [gameOver, setGameOver] = useState<{winner: string, p1Stats: any, p2Stats: any} | null>(null);

    useEffect(() => {
        const handleHealthChange = (e: any) => {
            const { playerId, hp, maxHp } = e.detail;
            if (playerId === 'local_player') {
                setP1Health({ hp, maxHp });
            } else if (playerId === 'remote_player') {
                setP2Health({ hp, maxHp });
            }
        };

        const handleGameOver = (e: any) => {
            setGameOver(e.detail);
        };

        const handleTimerUpdate = (e: any) => {
            setMatchTime(e.detail.time);
        };

        window.addEventListener('playerHealthChanged', handleHealthChange);
        window.addEventListener('gameOver', handleGameOver);
        window.addEventListener('timerUpdate', handleTimerUpdate);
        
        return () => {
            window.removeEventListener('playerHealthChanged', handleHealthChange);
            window.removeEventListener('gameOver', handleGameOver);
            window.removeEventListener('timerUpdate', handleTimerUpdate);
        };
    }, []);

    // Touch Handlers for Joystick
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        joyStartPos.current = { x: touch.clientX, y: touch.clientY };
        setJoystickActive(true);
        setJoystickPos({ x: 0, y: 0 });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!joystickActive) return;
        const touch = e.touches[0];
        
        const dx = touch.clientX - joyStartPos.current.x;
        const dy = touch.clientY - joyStartPos.current.y;
        
        // Clamp radius
        const radius = 30;
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
        const angle = Math.atan2(dy, dx);
        
        const clampedX = Math.cos(angle) * distance;
        const clampedY = Math.sin(angle) * distance;

        setJoystickPos({ x: clampedX, y: clampedY });

        // Emit input based on direction
        // Simple 4-way or 8-way logic conversion for the server/game
        // Thresholds
        const input = { left: false, right: false, up: false, down: false };
        if (clampedX < -15) input.left = true;
        if (clampedX > 15) input.right = true;
        if (clampedY < -15) input.up = true; // Jump is UP
        if (clampedY > 15) input.down = true;

        // We need to send this to the game. 
        // Direct socket emit might be too spammy or game logic specific.
        // Better: Update a global state or emit a 'joystickMove' event that GameScene listens to?
        // OR: emit 'playerInput' directly?
        // The GameScene updates physics based on input. 
        // Let's emit a simplified event 'clientInput' that GameScene listens to via Socket or EventBus.
        // For now, let's use the socket since GameScene listens to socket logic? 
        // Actually, GameScene listens to KEYBOARD. 
        // We need to inject this input into GameScene.
        // Let's emit a custom window event 'joystickInput' that GameScene can listen to.
        
        window.dispatchEvent(new CustomEvent('joystickInput', { detail: input }));
    };

    const handleTouchEnd = () => {
        setJoystickActive(false);
        setJoystickPos({ x: 0, y: 0 });
        window.dispatchEvent(new CustomEvent('joystickInput', { detail: { left: false, right: false, up: false, down: false } }));
    };

    return (
        <div className="absolute inset-0 pointer-events-none select-none">
            {/* Joystick Area (Bottom Left) */}
            <div 
                className="absolute w-24 h-24 bg-white/10 rounded-full backdrop-blur-sm pointer-events-auto touch-none flex items-center justify-center border-2 border-white/20"
                style={{
                    bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
                    left: 'max(1.5rem, env(safe-area-inset-left))'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                ref={joystickRef}
            >
                {/* Thumb */}
                <div 
                    className="w-12 h-12 bg-white/50 rounded-full shadow-lg transform transition-transform duration-75"
                    style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
                />
            </div>

            {/* Action Buttons (Bottom Right, XABY Diamond Layout - Clockwise starting from Top=X) */}
            <div 
                className="absolute w-36 h-36 pointer-events-auto select-none"
                style={{
                    bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
                    right: 'max(1.5rem, env(safe-area-inset-right))'
                }}
            >
                {/* X Button (Top) - Blue */}
                <button 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-black/40 border-2 border-blue-500/30 active:scale-90 transition-transform shadow-lg flex items-center justify-center backdrop-blur-sm"
                >
                    <span className="text-blue-500/80 font-bold text-xl drop-shadow-md">X</span>
                </button>

                {/* A Button (Right) - Red (Attack) */}
                <button 
                    className="absolute top-1/2 right-0 -translate-y-1/2 w-14 h-14 rounded-full bg-black/40 border-2 border-red-500/30 active:scale-90 transition-transform shadow-lg flex items-center justify-center backdrop-blur-sm"
                    onTouchStart={() => window.dispatchEvent(new CustomEvent('playerAction', { detail: { action: 'attack' } }))}
                >
                    <span className="text-red-500/80 font-bold text-2xl drop-shadow-md">A</span>
                </button>

                {/* B Button (Bottom) - Yellow (Jump) */}
                <button 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-black/40 border-2 border-yellow-500/30 active:scale-90 transition-transform shadow-lg flex items-center justify-center backdrop-blur-sm"
                    onTouchStart={() => window.dispatchEvent(new CustomEvent('joystickInput', { detail: { up: true } }))}
                >
                    <span className="text-yellow-500/80 font-bold text-xl drop-shadow-md">B</span>
                </button>

                {/* Y Button (Left) - Green (Block) */}
                <button 
                    className="absolute top-1/2 left-0 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 border-2 border-green-500/30 active:scale-90 transition-transform shadow-lg flex items-center justify-center backdrop-blur-sm"
                    onTouchStart={() => window.dispatchEvent(new CustomEvent('playerAction', { detail: { action: 'block' } }))}
                >
                    <span className="text-green-500/80 font-bold text-xl drop-shadow-md">Y</span>
                </button>
            </div>

             {/* HUD (Top) */}
             <div 
                className="absolute w-full flex justify-between items-start pointer-events-none"
                style={{ 
                    top: 'max(3rem, env(safe-area-inset-top))', // pushed down slightly so "EXIT MATCH" clears it 
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))', 
                    paddingRight: 'max(1rem, env(safe-area-inset-right))' 
                }}
             >
                {/* Player 1 Health */}
                <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-700/50 border-2 border-white/20 backdrop-blur-sm"></div>
                    <div>
                         <div className="text-white/80 font-bold text-sm shadow-black drop-shadow-md">Player 1</div>
                         <div className="w-32 h-3 bg-gray-900/60 rounded-full border border-gray-600/50 overflow-hidden backdrop-blur-sm">
                            <div 
                                className="h-full bg-gradient-to-r from-green-500/80 to-emerald-400/80 transition-all duration-200"
                                style={{ width: `${(p1Health.hp / p1Health.maxHp) * 100}%` }}
                            ></div>
                         </div>
                    </div>
                </div>
                
                {/* Match Timer */}
                <div className="text-white/90 font-cinzel text-3xl font-bold drop-shadow-md bg-black/30 px-4 py-1 rounded-lg border-2 border-yellow-500/30 backdrop-blur-sm">
                    {matchTime}
                </div>

                {/* Player 2 Health */}
                <div className="flex items-center gap-2 flex-row-reverse">
                    <div className="w-12 h-12 rounded-full bg-gray-700/50 border-2 border-white/20 backdrop-blur-sm"></div>
                    <div className="text-right">
                         <div className="text-white/80 font-bold text-sm shadow-black drop-shadow-md">Player 2</div>
                         <div className="w-32 h-3 bg-gray-900/60 rounded-full border border-gray-600/50 overflow-hidden flex justify-end backdrop-blur-sm">
                            <div 
                                className="h-full bg-gradient-to-l from-red-500/80 to-orange-400/80 transition-all duration-200"
                                style={{ width: `${(p2Health.hp / p2Health.maxHp) * 100}%` }}
                            ></div>
                         </div>
                    </div>
                </div>
             </div>

             {/* Game Over Pop-up */}
             {gameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto z-50 backdrop-blur-sm">
                    <div className="bg-black/60 border border-red-500/50 p-6 rounded-lg shadow-2xl flex flex-col items-center w-11/12 max-w-md transform transition-all scale-100 backdrop-blur-md">
                         <h1 className="text-3xl text-red-500 font-cinzel font-bold mb-6 drop-shadow-md tracking-widest">{gameOver.winner} WINS</h1>
                         
                         <div className="flex w-full justify-between gap-4 mb-6 text-sm">
                             {/* P1 Stats */}
                             <div className="flex-1 bg-transparent p-2">
                                  <h2 className="font-bold mb-3 text-white border-b border-red-500/30 pb-1">Shinobi</h2>
                                  <div className="flex justify-between mb-1 text-gray-400"><span>DMG Dealt:</span> <span className="text-red-400 font-bold">{gameOver.p1Stats.damageDealt}</span></div>
                                  <div className="flex justify-between mb-1 text-gray-400"><span>DMG Taken:</span> <span className="text-red-400 font-bold">{gameOver.p1Stats.damageTaken}</span></div>
                                  <div className="flex justify-between text-gray-400"><span>Blocks:</span> <span className="text-white font-bold">{gameOver.p1Stats.blocks}</span></div>
                             </div>
                             
                             {/* P2 Stats */}
                             <div className="flex-1 bg-transparent p-2">
                                  <h2 className="font-bold mb-3 text-white border-b border-red-500/30 pb-1">Samurai</h2>
                                  <div className="flex justify-between mb-1 text-gray-400"><span>DMG Dealt:</span> <span className="text-red-400 font-bold">{gameOver.p2Stats.damageDealt}</span></div>
                                  <div className="flex justify-between mb-1 text-gray-400"><span>DMG Taken:</span> <span className="text-red-400 font-bold">{gameOver.p2Stats.damageTaken}</span></div>
                                  <div className="flex justify-between text-gray-400"><span>Blocks:</span> <span className="text-white font-bold">{gameOver.p2Stats.blocks}</span></div>
                             </div>
                         </div>
                         
                         <button 
                            className="px-6 py-2 bg-red-600/80 border border-red-500 text-white font-bold rounded hover:bg-red-500 transition-colors shadow-lg" 
                            onClick={() => window.location.reload()}
                         >
                            REMATCH
                         </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlsOverlay;
