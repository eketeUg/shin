import { Scene } from 'phaser';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';
import { socket } from '../../services/socket';

export default class UIScene extends Scene {
    private joystick!: VirtualJoystick;
    private attackBtn!: Phaser.GameObjects.Arc;
    private skill1Btn!: Phaser.GameObjects.Arc;
    private skill2Btn!: Phaser.GameObjects.Arc;
    private jumpBtn!: Phaser.GameObjects.Arc;

    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create() {
        // --- Virtual Joystick (Left Side) ---
        this.joystick = new VirtualJoystick(this, {
            x: 120,
            y: 500,
            radius: 60,
            base: this.add.circle(0, 0, 60, 0x888888, 0.5),
            thumb: this.add.circle(0, 0, 30, 0xcccccc, 0.8),
            dir: '8dir',
        });

        // --- Action Buttons (Right Side) ---
        const baseX = 700;
        const baseY = 500;

        // Main Attack (Large, Center)
        this.attackBtn = this.createButton(baseX, baseY, 40, 0xff0000, 'ATK');
        this.attackBtn.on('pointerdown', () => socket.emit('playerAttack'));

        // Skill 1 (Top Left of Attack)
        this.skill1Btn = this.createButton(baseX - 60, baseY - 40, 25, 0x00ff00, 'S1');
        this.skill1Btn.on('pointerdown', () => console.log('Skill 1'));

        // Skill 2 (Top of Attack)
        this.skill2Btn = this.createButton(baseX, baseY - 80, 25, 0x0000ff, 'S2');
        this.skill2Btn.on('pointerdown', () => console.log('Skill 2'));

        // Jump/Dash (Right of Attack)
        this.jumpBtn = this.createButton(baseX + 60, baseY - 40, 25, 0xffff00, 'JMP');
        this.jumpBtn.on('pointerdown', () => console.log('Jump'));

        // --- HUD (Top) ---
        // Profile & Health (Top Left)
        this.add.rectangle(100, 40, 180, 50, 0x000000, 0.5);
        this.add.circle(40, 40, 20, 0xffffff); // Profile Pic Placeholder
        this.add.rectangle(110, 40, 100, 10, 0x00ff00); // Health Bar
        this.add.text(70, 20, 'Player 1', { fontSize: '14px', color: '#fff' });

        // Timer (Top Right)
        this.add.text(750, 30, '00:00', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
    }

    createButton(x: number, y: number, radius: number, color: number, label: string) {
        const btn = this.add.circle(x, y, radius, color, 0.7).setInteractive();
        this.add.text(x, y, label, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
        return btn;
    }

    getJoystickState() {
        return {
            left: this.joystick.left,
            right: this.joystick.right,
            up: this.joystick.up,
            down: this.joystick.down,
        };
    }
}
