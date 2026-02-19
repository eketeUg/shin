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
                width: window.innerWidth,
                height: window.innerHeight,
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { y: 0, x: 0 },
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
        <div id="game-container" className="w-full h-full overflow-hidden" />
    );
};

export default GameCanvas;
