import { Scene } from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    public id: string;
    private isLocal: boolean;

    constructor(scene: Scene, x: number, y: number, texture: string, id: string, isLocal: boolean = false) {
        super(scene, x, y, texture);
        
        this.id = id;
        this.isLocal = isLocal;
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        
        // visual placeholder for orientation
        this.setOrigin(0.5, 0.5);
    }

    update(cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys, joystick?: any) {
        // Animation logic placeholder
        // In the future, we will play animations here based on velocity and state
    }

    playAttackAnimation() {
        // Placeholder attack animation (spin)
        this.scene.tweens.add({
            targets: this,
            angle: 360,
            duration: 300,
            ease: 'Power2'
        });
        // Flash color
        this.setTint(0xff0000);
        this.scene.time.delayedCall(300, () => {
            this.clearTint();
        });
    }
}
