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
    
    // Joystick state for Player 1 (local player)
    private moveInput = { left: false, right: false, up: false, down: false };

    private matchTimer: number = 99;
    private timerEvent!: Phaser.Time.TimerEvent;

    private gameMode: 'PVP' | 'PVE' = 'PVP';
    private p1CharType: string = 'shinobi';
    private p2CharType: string = 'samurai';
    private lastAIAttackTime: number = 0;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data: { mode?: 'PVP' | 'PVE', p1?: string, p2?: string }) {
        if (data.mode) this.gameMode = data.mode;
        if (data.p1) this.p1CharType = data.p1;
        if (data.p2) this.p2CharType = data.p2;
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

        // Dynamically create animations for all 10 characters
        const characters = [
            'Fighter', 'Knight_1', 'Kunoichi', 'Ninja_Monk', 'Ninja_Peasant',
            'Samurai', 'Samurai_1', 'Samurai_Archer', 'Samurai_Commander', 'Shinobi'
        ];

        characters.forEach(char => {
            const prefix = char.toLowerCase();

            this.anims.create({ key: `${prefix}_idle`, frames: `${prefix}_idle`, frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}_run`, frames: `${prefix}_run`, frameRate: 12, repeat: -1 });
            
            // Assuming most jumps have ~12 frames
            this.anims.create({ key: `${prefix}_jump`, frames: this.anims.generateFrameNumbers(`${prefix}_jump`, { start: 0, end: 11 }), frameRate: 15, repeat: 0 });
            
            // Combo attacks (assuming ~5 frames)
            this.anims.create({ key: `${prefix}_attack_1`, frames: this.anims.generateFrameNumbers(`${prefix}_attack_1`, { start: 0, end: 4 }), frameRate: 15, repeat: 0 });
            this.anims.create({ key: `${prefix}_attack_2`, frames: this.anims.generateFrameNumbers(`${prefix}_attack_2`, { start: 0, end: 4 }), frameRate: 15, repeat: 0 });
            this.anims.create({ key: `${prefix}_attack_3`, frames: this.anims.generateFrameNumbers(`${prefix}_attack_3`, { start: 0, end: 4 }), frameRate: 15, repeat: 0 });
            
            // Block and Dead
            this.anims.create({ key: `${prefix}_block`, frames: `${prefix}_shield`, frameRate: 12, repeat: 0 });
            this.anims.create({ key: `${prefix}_dead`, frames: `${prefix}_dead`, frameRate: 8, repeat: 0 });
        });

        // Set the world bounds so the floor sits above the UI controls (approx 150px from bottom)
        this.physics.world.setBounds(0, 0, width, height - uiHeight);

        // Initialize Player entities
        // Player 1
        this.player = new Player(this, width / 2 - 200, height - uiHeight - 100, `${this.p1CharType}_idle`, this.p1CharType, 'local_player', true);
        this.player.anims.play(`${this.p1CharType}_idle`, true); // Play default idle animation
        
        // Player 2
        this.player2 = new Player(this, width / 2 + 200, height - uiHeight - 100, `${this.p2CharType}_idle`, this.p2CharType, 'remote_player', false);
        this.player2.setFlipX(true); // Face left
        this.player2.anims.play(`${this.p2CharType}_idle`, true);

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

        // Start Arena Background Music
        try {
            const bgm = this.sound.add('arena_bgm', { loop: true, volume: 0.5 });
            bgm.play();
            // Tell React to stop the website BGM
            window.dispatchEvent(new CustomEvent('arenaStarted'));
        } catch (e) {
            console.warn('Arena BGM not loaded');
        }

        // Initialize Match Timer
        this.timerEvent = this.time.addEvent({
            delay: 1000, // 1 second
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        window.dispatchEvent(new CustomEvent('timerUpdate', { detail: { time: this.matchTimer } }));

        // Listen to custom DOM events emitted by ControlsOverlay
        this.setupDOMEventListeners();
    }

    private updateTimer() {
        if (this.matchTimer > 0 && !this.player.isDead && !this.player2.isDead) {
            this.matchTimer--;
            window.dispatchEvent(new CustomEvent('timerUpdate', { detail: { time: this.matchTimer } }));

            if (this.matchTimer === 0) {
                this.timerEvent.remove();
                this.handleTimeUp();
            }
        }
    }

    private handleTimeUp() {
        // Determine Winner based on Health
        let winnerStr = 'DRAW - TIME UP';
        if (this.player.hp > this.player2.hp) {
            winnerStr = `Player 1 (${this.p1CharType.toUpperCase()}) WINS ON TIME`;
        } else if (this.player2.hp > this.player.hp) {
            winnerStr = `${this.gameMode === 'PVE' ? 'CPU' : 'Player 2'} (${this.p2CharType.toUpperCase()}) WINS ON TIME`;
        }

        try { this.sound.play('victory'); } catch (e) {}

        window.dispatchEvent(new CustomEvent('gameOver', {
            detail: {
                winner: winnerStr,
                p1Stats: this.player.stats,
                p2Stats: this.player2.stats
            }
        }));
    }

    update() {
        if (this.player) {
            this.player.update(undefined, this.moveInput);
        }
        
        if (this.player2) {
            if (this.gameMode === 'PVP') {
                // Keyboard logic for local Player 2
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
            } else if (this.gameMode === 'PVE') {
                this.updateAI();
            }
        }
    }

    private updateAI() {
        if (!this.player || !this.player2 || this.player.isDead || this.player2.isDead || this.matchTimer <= 0) return;

        const p1X = this.player.x;
        const p2X = this.player2.x;
        const distance = Math.abs(p1X - p2X);

        // CPU Move Input
        let aiJoystick = { left: false, right: false, up: false, down: false };
        const now = this.time.now;

        // Simple chase logic
        if (distance > 70) {
            if (p2X > p1X) {
                aiJoystick.left = true;
            } else {
                aiJoystick.right = true;
            }
        } else {
            // Close enough to attack or block
            if (now - this.lastAIAttackTime > 1000) {
                // Randomly decide action
                const rand = Math.random();
                if (rand > 0.3) {
                    this.player2.playAttackAnimation();
                } else {
                    this.player2.playBlockAnimation();
                }
                this.lastAIAttackTime = now;
            }
        }

        // Apply movement/physics payload
        this.player2.update(undefined, aiJoystick);
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
                    try { this.sound.play('victory'); } catch (e) {}
                    
                    window.dispatchEvent(new CustomEvent('gameOver', {
                        detail: {
                            winner: attacker.id === 'local_player' ? `Player 1 (${this.p1CharType.toUpperCase()})` : `${this.gameMode === 'PVE' ? 'CPU' : 'Player 2'} (${this.p2CharType.toUpperCase()})`,
                            p1Stats: this.player.stats,
                            p2Stats: this.player2.stats
                        }
                    }));
                }, 1000);
            }
        }
    }
}
