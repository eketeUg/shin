import { socket } from '../../services/socket';
import { Scene } from 'phaser';

export default class MenuScene extends Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        // Load assets here
        this.load.setBaseURL('https://labs.phaser.io/assets/');
        this.load.image('logo', 'sprites/phaser3-logo.png');
    }

    create() {
        const logo = this.add.image(400, 150, 'logo');
        
        this.add.text(400, 300, 'OGU: The Struggle', {
            fontSize: '32px',
            color: '#fff',
        }).setOrigin(0.5);

        this.add.text(400, 400, 'Click to Start', {
            fontSize: '24px',
            color: '#fff',
        }).setOrigin(0.5);

        this.input.on('pointerdown', () => {
            if (!socket.connected) {
                socket.connect();
            }
            this.scene.start('GameScene');
        });
    }
}
