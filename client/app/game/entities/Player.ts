import { Scene } from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    public id: string;
    private isLocal: boolean;
    private charType: string;
    
    // Combat Properties
    public hp: number = 100;
    public maxHp: number = 100;
    public isDead: boolean = false;
    public attackHitbox!: Phaser.GameObjects.Zone;
    public isAttacking: boolean = false;
    public isBlocking: boolean = false;
    public hasHit: boolean = false;

    // Track end-of-game statistics
    public stats = {
        damageDealt: 0,
        damageTaken: 0,
        blocks: 0
    };

    // Audio states for looping sounds
    private moveSound: Phaser.Sound.BaseSound | null = null;
    private idleSound: Phaser.Sound.BaseSound | null = null;

    // Combo System
    private comboStep: number = 1;
    private lastAttackTime: number = 0;

    constructor(scene: Scene, x: number, y: number, texture: string, charType: string, id: string, isLocal: boolean = false) {
        super(scene, x, y, texture);
        
        this.id = id;
        this.isLocal = isLocal;
        this.charType = charType;
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        this.setOrigin(0.5, 0.5);
        this.setScale(2.0); // Make the character bigger

        // Initialize looping sound objects
        try {
            this.moveSound = scene.sound.add('move', { loop: true });
            this.idleSound = scene.sound.add('idle', { loop: true });
            
            // Start idle sound by default
            if (this.idleSound) this.idleSound.play();
        } catch (e) {
            console.warn('Audio not loaded yet:', e);
        }

        // Shrink the physics body so players can get closer together
        const body = this.body as Phaser.Physics.Arcade.Body;
        
        if (charType === 'ninja_monk' || charType === 'ninja_peasant') {
            // These characters have 96x96 sprite frames
            body.setSize(30, 68); 
            body.setOffset(33, 28); // Bottom aligned: 28 + 68 = 96
        } else {
            // Standard 128x128 sprite frames
            body.setSize(40, 90); 
            body.setOffset(44, 38); // Bottom aligned: 38 + 90 = 128
        }

        // Create Attack Hitbox (in front of player)
        this.attackHitbox = scene.add.zone(x, y, 60, 100);
        scene.physics.add.existing(this.attackHitbox);
        const hitboxBody = this.attackHitbox.body as Phaser.Physics.Arcade.Body;
        hitboxBody.setAllowGravity(false);
        hitboxBody.moves = false;
    }

    update(cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys, joystick?: { left: boolean, right: boolean, up: boolean, down: boolean }) {
        if (this.isDead) return; // Cannot move if dead
        
        // Update Hitbox position relative to player facing direction
        const offsetX = this.flipX ? -60 : 60;
        this.attackHitbox.x = this.x + offsetX;
        this.attackHitbox.y = this.y;

        if (!joystick) return;

        const speed = 450; // Increased speed for running mechanics
        const jumpForce = -450;
        
        const isAttackingOrBlocking = this.isAttacking || this.isBlocking;

        // Cast body to dynamic body to access onFloor()
        const dynamicBody = this.body as Phaser.Physics.Arcade.Body;
        
        if (isAttackingOrBlocking) {
            // Stop horizontal movement while attacking or blocking
            if (dynamicBody?.onFloor()) {
                this.setVelocityX(0);
            }
            // Do not process joystick for walking or jumping
        } else {
            // Handle horizontal movement
            if (joystick.left) {
                this.setVelocityX(-speed);
                this.setFlipX(true); // face left
                if (dynamicBody?.onFloor()) {
                    this.anims.play(`${this.charType}_run`, true);
                    this.playMoveSound();
                }
            } else if (joystick.right) {
                this.setVelocityX(speed);
                this.setFlipX(false); // face right
                if (dynamicBody?.onFloor()) {
                    this.anims.play(`${this.charType}_run`, true);
                    this.playMoveSound();
                }
            } else {
                this.setVelocityX(0);
                if (dynamicBody?.onFloor()) {
                    this.anims.play(`${this.charType}_idle`, true);
                    this.playIdleSound();
                }
            }

            // Handle Jump
            if (joystick.up && dynamicBody?.onFloor()) {
                this.setVelocityY(jumpForce);
                try { this.scene.sound.play('jump'); } catch (e) {}
            }
        }

        if (!dynamicBody?.onFloor() && !isAttackingOrBlocking) {
            this.anims.play(`${this.charType}_jump`, true);
            this.stopLoopingSounds();
        }
    }

    private playMoveSound() {
        if (this.idleSound?.isPlaying) this.idleSound.stop();
        if (this.moveSound && !this.moveSound.isPlaying) this.moveSound.play();
    }

    private playIdleSound() {
        if (this.moveSound?.isPlaying) this.moveSound.stop();
        if (this.idleSound && !this.idleSound.isPlaying) this.idleSound.play();
    }

    private stopLoopingSounds() {
        if (this.moveSound?.isPlaying) this.moveSound.stop();
        if (this.idleSound?.isPlaying) this.idleSound.stop();
    }

    playAttackAnimation() {
        if (this.isAttacking || this.isBlocking || this.isDead) return; // Don't interrupt actions

        const now = this.scene.time.now;
        if (now - this.lastAttackTime > 800) {
            this.comboStep = 1; // Reset combo if too much time has passed
        } else {
            this.comboStep++;
        }

        let animKey = `${this.charType}_attack_${this.comboStep}`;
        // If the combo step goes beyond what this character has, reset to 1
        if (!this.scene.anims.exists(animKey)) {
            this.comboStep = 1;
            animKey = `${this.charType}_attack_1`;
        }
        
        // Failsafe in case the character lacks attack animations entirely
        if (!this.scene.anims.exists(animKey)) {
            return;
        }

        this.lastAttackTime = now;
        this.isAttacking = true;
        this.hasHit = false; // Reset hit flag for new attack
        this.anims.play(animKey);
        this.stopLoopingSounds();
        
        try { 
            this.scene.sound.play(`${this.charType}_attack`); 
            this.scene.sound.play(`${this.charType}_effort`); 
            window.dispatchEvent(new CustomEvent('playerAudio', { detail: { type: 'attack', charType: this.charType } }));
        } catch (e) {}

        this.once(`animationcomplete-${animKey}`, () => {
            this.isAttacking = false;
            const dynamicBody = this.body as Phaser.Physics.Arcade.Body;
            if (dynamicBody?.onFloor() && !this.isDead) {
                this.anims.play(`${this.charType}_idle`);
            }
        });
    }

    playBlockAnimation() {
        if (this.isAttacking || this.isBlocking || this.isDead) return; // Don't interrupt actions

        this.isBlocking = true;
        this.anims.play(`${this.charType}_block`);
        
        this.once(`animationcomplete-${this.charType}_block`, () => {
            this.isBlocking = false;
            const dynamicBody = this.body as Phaser.Physics.Arcade.Body;
            if (dynamicBody?.onFloor() && !this.isDead) {
                this.anims.play(`${this.charType}_idle`);
            }
        });
    }

    resetState() {
        this.isAttacking = false;
        this.isBlocking = false;
        this.hasHit = false;
        this.isDead = false;
        this.comboStep = 1;
        this.clearTint();
        this.stopLoopingSounds();
    }

    takeDamage(amount: number): number {
        if (this.isDead) return 0;

        let actualDamage = amount;

        // Mitigate damage if blocking
        if (this.isBlocking) {
            actualDamage = 0; // Take 0 damage when blocking
            this.stats.blocks += 1; // Track successful blocks
            try { 
                this.scene.sound.play('hit', { volume: 0.5 }); 
                window.dispatchEvent(new CustomEvent('playerAudio', { detail: { type: 'block_hit', id: this.id } }));
            } catch (e) {}
        } else {
            try { 
                this.scene.sound.play('hit'); 
                window.dispatchEvent(new CustomEvent('playerAudio', { detail: { type: 'hit', id: this.id } }));
            } catch (e) {}
        }

        this.hp -= actualDamage;
        this.stats.damageTaken += actualDamage;

        // Flash Red on hit
        this.setTint(0xff0000);
        this.scene.time.delayedCall(150, () => {
            if (!this.isDead) this.clearTint();
        });

        if (this.hp <= 0) {
            this.hp = 0;
            if (!this.isDead) {
                this.isDead = true;
                this.setVelocityX(0); // Stop movement
                this.stopLoopingSounds();
                this.anims.play(`${this.charType}_dead`);
                try { 
                    this.scene.sound.play('death'); 
                    window.dispatchEvent(new CustomEvent('playerAudio', { detail: { type: 'death', id: this.id } }));
                } catch (e) {}
            }
        }

        // Dispatch health change event so React UI can catch it
        window.dispatchEvent(new CustomEvent('playerHealthChanged', {
            detail: { playerId: this.id, hp: this.hp, maxHp: this.maxHp }
        }));
        
        return actualDamage;
    }
}
