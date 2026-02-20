import * as Phaser from 'phaser';
import Player from '../entities/Player';

export class GameScene extends Phaser.Scene {
    private player!: Player;
    private player2!: Player;
    private background!: Phaser.GameObjects.TileSprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private aKey!: Phaser.Input.Keyboard.Key;
    private attackKey!: Phaser.Input.Keyboard.Key;
    private blockKey!: Phaser.Input.Keyboard.Key;
    
    // Joystick state
    private moveInput = { left: false, right: false, up: false, down: false };

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load background
        this.load.image('bg', '/assets/shin_bg.png');

        // Load Shinobi Sprites (Assume frames are 128x128)
        this.load.spritesheet('shinobi_idle', '/assets/sprites/Shinobi/Idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('shinobi_run', '/assets/sprites/Shinobi/Run.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('shinobi_jump', '/assets/sprites/Shinobi/Jump.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('shinobi_attack', '/assets/sprites/Shinobi/Attack_1.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('shinobi_shield', '/assets/sprites/Shinobi/Shield.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('shinobi_dead', '/assets/sprites/Shinobi/Dead.png', { frameWidth: 128, frameHeight: 128 });

        // Load Samurai Sprites (Assume frames are 128x128)
        this.load.spritesheet('samurai_idle', '/assets/sprites/Samurai/Idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('samurai_run', '/assets/sprites/Samurai/Run.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('samurai_jump', '/assets/sprites/Samurai/Jump.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('samurai_attack', '/assets/sprites/Samurai/Attack_1.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('samurai_shield', '/assets/sprites/Samurai/Shield.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('samurai_dead', '/assets/sprites/Samurai/Dead.png', { frameWidth: 128, frameHeight: 128 });
    }

    create() {
        // Create an infinite tiling background
        const width = this.scale.width;
        const height = this.scale.height;
        this.background = this.add.tileSprite(width / 2, height / 2, width, height, 'bg');
        // Fit background to height
        this.background.setDisplaySize(width, height);
        this.background.setScrollFactor(0); // Optional: if we add cameras later
        this.background.setAlpha(0.3); // Make the background quite transparent to see character better

        // Add a dark floor overlay to visually represent the UI area at the bottom
        const uiHeight = 180;
        const floorOverlay = this.add.rectangle(width / 2, height - (uiHeight / 2), width, uiHeight, 0x000000, 0.8);
        floorOverlay.setDepth(10); // Ensure it renders above the background

        // Setup Shinobi Animations
        this.anims.create({
            key: 'shinobi_idle',
            frames: 'shinobi_idle',
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'shinobi_run',
            frames: 'shinobi_run',
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'shinobi_jump',
            frames: 'shinobi_jump',
            frameRate: 12,
            repeat: 0
        });

        this.anims.create({
            key: 'shinobi_attack',
            frames: 'shinobi_attack',
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'shinobi_block',
            frames: 'shinobi_shield',
            frameRate: 12,
            repeat: 0
        });

        this.anims.create({
            key: 'shinobi_dead',
            frames: 'shinobi_dead',
            frameRate: 8,
            repeat: 0
        });

        // Setup Samurai Animations
        this.anims.create({
            key: 'samurai_idle',
            frames: 'samurai_idle',
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'samurai_run',
            frames: 'samurai_run',
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'samurai_jump',
            frames: 'samurai_jump',
            frameRate: 12,
            repeat: 0
        });

        this.anims.create({
            key: 'samurai_attack',
            frames: 'samurai_attack',
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'samurai_block',
            frames: 'samurai_shield',
            frameRate: 12,
            repeat: 0
        });

        this.anims.create({
            key: 'samurai_dead',
            frames: 'samurai_dead',
            frameRate: 8,
            repeat: 0
        });

        // Set the world bounds so the floor sits above the UI controls (approx 150px from bottom)
        this.physics.world.setBounds(0, 0, width, height - uiHeight);

        // Initialize Player entities
        // Player 1 (Shinobi)
        this.player = new Player(this, width / 2 - 200, height - uiHeight - 100, 'shinobi_idle', 'shinobi', 'local_player', true);
        this.player.anims.play('shinobi_idle', true); // Play default idle animation
        
        // Player 2 (Samurai)
        this.player2 = new Player(this, width / 2 + 200, height - uiHeight - 100, 'samurai_idle', 'samurai', 'remote_player', false);
        this.player2.setFlipX(true); // Face left
        this.player2.anims.play('samurai_idle', true);

        // Add rudimentary collision between players (pushing apart)
        this.physics.add.collider(this.player, this.player2);

        // Add overlap detection for attack hitboxes
        this.physics.add.overlap(this.player.attackHitbox, this.player2, () => this.handleAttackHit(this.player, this.player2));
        this.physics.add.overlap(this.player2.attackHitbox, this.player, () => this.handleAttackHit(this.player2, this.player));

        // Setup keyboard inputs for Player 2 (Samurai)
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys(); // Up/Down/Left/Right
            this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A); // A for Attack
            this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S); // S for Attack
            this.blockKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D); // D for Block
        }

        // Listen to custom DOM events emitted by ControlsOverlay
        this.setupDOMEventListeners();
    }

    update() {
        if (this.player) {
            this.player.update(undefined, this.moveInput);
        }
        
        // Keyboard logic for player 2
        if (this.player2) {
            const p2Joystick = {
                left: this.cursors?.left.isDown || false,
                right: this.cursors?.right.isDown || false,
                up: this.cursors?.up.isDown || false,
                down: this.cursors?.down.isDown || false
            };
            
            this.player2.update(undefined, p2Joystick);

            if (Phaser.Input.Keyboard.JustDown(this.aKey) || Phaser.Input.Keyboard.JustDown(this.attackKey)) {
                this.player2.playAttackAnimation();
            } else if (Phaser.Input.Keyboard.JustDown(this.blockKey)) {
                this.player2.playBlockAnimation();
            }
        }
    }

    private setupDOMEventListeners() {
        // Disconnect old listeners to prevent memory leaks if scene restarts
        window.removeEventListener('joystickInput', this.handleJoystickInput as EventListener);
        window.removeEventListener('playerAction', this.handlePlayerAction as EventListener);

        window.addEventListener('joystickInput', this.handleJoystickInput as EventListener);
        window.addEventListener('playerAction', this.handlePlayerAction as EventListener);
        
        this.events.on(Phaser.Scenes.Events.DESTROY, () => {
            window.removeEventListener('joystickInput', this.handleJoystickInput as EventListener);
            window.removeEventListener('playerAction', this.handlePlayerAction as EventListener);
        });
    }

    private handleJoystickInput = (e: CustomEvent<{ left: boolean, right: boolean, up: boolean, down: boolean }>) => {
        this.moveInput = e.detail;
    };

    private handlePlayerAction = (e: CustomEvent<{ action: string }>) => {
        if (!this.player) return;
        
        if (e.detail.action === 'attack') {
            this.player.playAttackAnimation();
        } else if (e.detail.action === 'block') {
            this.player.playBlockAnimation();
        }
    };

    private handleAttackHit(attacker: Player, target: Player) {
        if (attacker.isAttacking && !attacker.hasHit && !attacker.isDead && !target.isDead) {
            attacker.hasHit = true; // Ensure they only hit once per attack animation
            const actualDamage = target.takeDamage(10); // Hardcoded 10 damage for now
            attacker.stats.damageDealt += actualDamage;

            // Check for death
            if (target.hp <= 0 && target.isDead) {
                // Wait slightly before showing game over so animation starts
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('gameOver', {
                        detail: {
                            winner: attacker.id === 'local_player' ? 'Player 1 (Shinobi)' : 'Player 2 (Samurai)',
                            p1Stats: this.player.stats,
                            p2Stats: this.player2.stats
                        }
                    }));
                }, 1000);
            }
        }
    }
}
