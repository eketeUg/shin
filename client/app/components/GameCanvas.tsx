import BootScene from '../game/scenes/BootScene';
import MenuScene from '../game/scenes/MenuScene';
import GameScene from '../game/scenes/GameScene';
import UIScene from '../game/scenes/UIScene';
'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';

const GameCanvas = () => {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                // Determine parent based on device (simplified for now, using a shared ref approach would be better but keeping it simple)
                // We will use a ref to finding the active container is tricky with CSS hiding.
                // Let's stick to a single container ID but move it in DOM or styling? 
                // Better approach: Use a single ID 'game-root' and style IT.
                parent: 'game-root',
                width: 1266, 
                height: 600,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { y: 600, x: 0 },
                        debug: true,
                    },
                },
                scene: [BootScene, MenuScene, GameScene, UIScene],
            };

            gameRef.current = new Phaser.Game(config);
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
            
            {/* Game Container */}
            <div 
                id="game-root"
                className="
                    relative 
                    w-full h-full 
                    md:w-auto md:h-auto md:max-w-5xl md:aspect-[19/9]
                    md:rounded-xl md:border-4 md:border-shin-dark md:shadow-2xl md:ring-1 md:ring-gray-800
                    landscape:block portrait:hidden md:portrait:block
                "
            />

            {/* Portrait Warning (Mobile Only) */}
            <div className="
                fixed inset-0 z-50 flex flex-col items-center justify-center 
                bg-black text-white p-8 text-center
                landscape:hidden md:hidden
            ">
                <div className="animate-pulse">
                    <h1 className="text-3xl font-black font-cinzel text-shin-red mb-4">ROTATE DEVICE</h1>
                    <p className="text-gray-400 text-sm mb-8 tracking-widest uppercase"> Landscape Mode Required</p>
                    <div className="text-6xl text-shin-gold">⟳</div>
                </div>
            </div>

        </div>
    );
};

export default GameCanvas;
