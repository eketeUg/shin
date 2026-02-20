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

        // Shrink the physics body so players can get closer together
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(40, 90); // Narrow width, reasonable height
        body.setOffset(44, 38); // Center the body within the 128x128 sprite frame

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

        const speed = 250;
        const jumpForce = -450;
        
        const isAttackingOrBlocking = this.isAttacking || this.isBlocking;

        // Cast body to dynamic body to access onFloor()
        const dynamicBody = this.body as Phaser.Physics.Arcade.Body;
        
        // Handle horizontal movement
        if (joystick.left) {
            this.setVelocityX(-speed);
            this.setFlipX(true); // face left
            if (dynamicBody?.onFloor() && !isAttackingOrBlocking) {
                this.anims.play(`${this.charType}_run`, true);
            }
        } else if (joystick.right) {
            this.setVelocityX(speed);
            this.setFlipX(false); // face right
            if (dynamicBody?.onFloor() && !isAttackingOrBlocking) {
                this.anims.play(`${this.charType}_run`, true);
            }
        } else {
            this.setVelocityX(0);
            if (dynamicBody?.onFloor() && !isAttackingOrBlocking) {
                this.anims.play(`${this.charType}_idle`, true);
            }
        }

        // Handle Jump
        if (joystick.up && dynamicBody?.onFloor()) {
            this.setVelocityY(jumpForce);
        }

        if (!dynamicBody?.onFloor() && !isAttackingOrBlocking) {
            this.anims.play(`${this.charType}_jump`, true);
        }
    }

    playAttackAnimation() {
        if (this.isAttacking || this.isBlocking || this.isDead) return; // Don't interrupt actions

        this.isAttacking = true;
        this.hasHit = false; // Reset hit flag for new attack
        this.anims.play(`${this.charType}_attack`);

        this.once(`animationcomplete-${this.charType}_attack`, () => {
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

    takeDamage(amount: number): number {
        if (this.isDead) return 0;

        let actualDamage = amount;

        // Mitigate damage if blocking
        if (this.isBlocking) {
            actualDamage = Math.floor(amount * 0.2); // Take 20% chip damage when blocking
            this.stats.blocks += 1; // Track successful blocks
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
                this.anims.play(`${this.charType}_dead`);
            }
        }

        // Dispatch health change event so React UI can catch it
        window.dispatchEvent(new CustomEvent('playerHealthChanged', {
            detail: { playerId: this.id, hp: this.hp, maxHp: this.maxHp }
        }));
        
        return actualDamage;
    }
}
