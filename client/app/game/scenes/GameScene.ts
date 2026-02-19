import { Scene } from 'phaser';
import { socket } from '../../services/socket';
import UIScene from './UIScene';
import Player from '../entities/Player';

export default class GameScene extends Scene {
    private players: Map<string, Player> = new Map();
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private uiScene!: UIScene;

    constructor() {
        super('GameScene');
    }

    preload() {
        // Assets loaded in BootScene
    }

    create() {
        this.add.image(400, 300, 'sky');
        
        // Input events
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // Get UI Scene
        this.uiScene = this.scene.get('UIScene') as UIScene;

        // Socket events
        socket.on('currentPlayers', (players: any[]) => {
            players.forEach((player) => this.addPlayer(player));
        });

        socket.on('newPlayer', (player) => {
            this.addPlayer(player);
        });

        socket.on('playerMoved', (playerInfo) => {
            const player = this.players.get(playerInfo.id);
            if (player) {
                player.setPosition(playerInfo.x, playerInfo.y);
                // Flip sprite based on direction
                if (playerInfo.x < player.x) player.setFlipX(true);
                else if (playerInfo.x > player.x) player.setFlipX(false);
            }
        });

        socket.on('playerAttacked', (data) => {
            const player = this.players.get(data.id);
            if (player) {
                player.playAttackAnimation();
            }
        });

        socket.on('disconnect', (playerId) => {
             console.log('Disconnected');
        });

        // Request join
        socket.emit('join_game');
    }

    addPlayer(playerInfo: any) {
        if (this.players.has(playerInfo.id)) return;

        const isLocal = playerInfo.id === socket.id;
        const player = new Player(this, playerInfo.x, playerInfo.y, 'red', playerInfo.id, isLocal);
        this.players.set(playerInfo.id, player);
    }

    update() {
        if (!this.cursors) return;

        const myPlayer = this.players.get(socket.id || '');
        if (myPlayer) {
            const speed = 160;
            let moved = false;
            let velocityX = 0;
            let velocityY = 0;

            const joystick = this.uiScene.getJoystickState();

            if (this.cursors.left.isDown || joystick.left) {
                velocityX = -speed;
                moved = true;
                myPlayer.setFlipX(true);
            } else if (this.cursors.right.isDown || joystick.right) {
                velocityX = speed;
                moved = true;
                myPlayer.setFlipX(false);
            }

            if (this.cursors.up.isDown || joystick.up) {
                velocityY = -speed;
                moved = true;
            } else if (this.cursors.down.isDown || joystick.down) {
                velocityY = speed;
                moved = true;
            }

            myPlayer.setVelocity(velocityX, velocityY);

            if (moved) {
                socket.emit('playerInput', { x: myPlayer.x, y: myPlayer.y });
            }

            if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
                socket.emit('playerAttack');
            }
        }
    }
}
