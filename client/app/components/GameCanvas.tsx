'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';

import ControlsOverlay from './ControlsOverlay';
import { GameScene } from '../game/scenes/GameScene';
import Preloader from '../game/scenes/Preloader';

const GameCanvas = () => {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        // Prevent strictly all scroll/bounce logic on mobile browsers
        const preventDefault = (e: TouchEvent) => {
            if (e.touches.length > 1) e.preventDefault(); // Prevent pinch zoom
            // Prevent scrolling unless it's on an element we explicitly want to scroll
            e.preventDefault();
        };
        
        document.addEventListener('touchmove', preventDefault, { passive: false });
        
        return () => {
            document.removeEventListener('touchmove', preventDefault);
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                parent: 'game-root', // Attach the canvas to our container
                width: 1280, 
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
            };

            gameRef.current = new Phaser.Game(config);

            // Manually add scenes and only start Preloader immediately
            gameRef.current.scene.add('Preloader', Preloader, true);
            gameRef.current.scene.add('GameScene', GameScene, false);
        }

        const handleStartGame = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (gameRef.current) {
                // Pass the selection details (mode, p1, p2) to the GameScene's init() method
                gameRef.current.scene.start('GameScene', customEvent.detail);
            }
        };

        window.addEventListener('startGameScene', handleStartGame);

        return () => {
            window.removeEventListener('startGameScene', handleStartGame);
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
