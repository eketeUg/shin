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
                parent: 'game-container',
                width: 1266, // 19:9 Aspect Ratio (600 * 2.11)
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
        <div className="flex items-center justify-center w-full h-full bg-black/50">
            <div 
                id="game-container" 
                className="relative w-full h-full md:w-[850px] md:h-[400px] lg:w-[1000px] lg:h-[470px] overflow-hidden md:rounded-xl md:border-4 md:border-gray-800 md:shadow-2xl"
            />
        </div>
    );
};

export default GameCanvas;
