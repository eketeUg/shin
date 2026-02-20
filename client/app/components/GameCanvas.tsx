'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';

import ControlsOverlay from './ControlsOverlay';
import { GameScene } from '../game/scenes/GameScene';

const GameCanvas = () => {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                parent: 'game-root', // Attach the canvas to our container
                // Determine parent based on device
                width: 1280, // Fixed resolution (~19.2:9 aspect ratio)
                height: 600,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { y: 600, x: 0 },
                        debug: true, // You can turn this off later
                    },
                },
                scene: [GameScene],
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
            
            {/* Main Game Wrapper - Constrains size on Desktop, Full on Mobile */}
            <div className="
                relative 
                w-full h-full 
                md:w-[1280px] md:h-[600px] 
                md:max-w-[95vw] md:max-h-[90vh]
                md:rounded-xl md:border-4 md:border-shin-dark md:shadow-2xl md:ring-1 md:ring-gray-800
                overflow-hidden
                landscape:block portrait:hidden md:portrait:block
            ">
                <div id="game-root" className="w-full h-full" />
                <ControlsOverlay />
            </div>

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
