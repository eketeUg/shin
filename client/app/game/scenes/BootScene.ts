import { Scene } from 'phaser';

export default class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load the loading screen image
        // We load this first so we can display it while other assets load
        this.load.image('loading_bg', '/assets/loading.png');
    }

    create() {
        // Display the loading screen
        const { width, height } = this.scale;
        const bg = this.add.image(width / 2, height / 2, 'loading_bg');
        
        // Scale background to cover the screen while maintaining aspect ratio
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setScrollFactor(0);

        // Add loading text/bar if needed
        const loadingText = this.add.text(width / 2, height - 50, 'Loading...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Preload other game assets here
        this.load.setBaseURL('https://labs.phaser.io/assets/');
        this.load.image('sky', 'skies/space3.png');
        this.load.image('red', 'particles/red.png');

        // Fake loading duration for demonstration (since we don't have many assets yet)
        // In a real game, you'd use this.load.on('complete', ...)
        
        // Start loading real assets
        this.load.start();

        // For now, simulate a delay to show off the cool screen
        this.time.delayedCall(3000, () => {
             this.scene.start('MenuScene');
        });
    }
}
