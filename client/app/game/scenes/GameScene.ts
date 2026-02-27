import * as Phaser from 'phaser';
import Player from '../entities/Player';
import { 
    ApplySystem, 
    FindWorldPda, 
    BN 
} from '@magicblock-labs/bolt-sdk';
import { PublicKey } from '@solana/web3.js';

// BOLT IDs
const WORLD_ID = new BN(1);
const WORLD_PROGRAM_ID = new PublicKey("WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n");
const MOVEMENT_SYSTEM_ID = new PublicKey("F7gqb5y4yvfW3ygozt5TTBoPL6mmJ5FxX9FqjJvNcfuR");
const COMBAT_SYSTEM_ID = new PublicKey("68M2Gjo9wtqG7GUMMnm6NqNB9E7xmZS2zcNbTvgwQ7az");
const POSITION_COMPONENT_ID = new PublicKey("GJp9uPK4xzU9vbobTvwJbGUPrRgUZXr1vbf7Fv6ePf58");
const HEALTH_COMPONENT_ID = new PublicKey("3ZzeR3FP7Bur8rpdB48WurX7EYvf3Cnzp3cHKz7kAvrx");
const COMBAT_STATE_COMPONENT_ID = new PublicKey("9A5fzxAgfpjsVVVKqEAqGYb2W6DuQjNwci1WneryCbza");

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

    // Spectator Mode variables
    private matchId: string | null = null;
    private isOnlineHost: boolean = false;
    private remoteP2Input = { left: false, right: false, up: false, down: false };
    private syncTimerEvent!: Phaser.Time.TimerEvent;

    private gameMode: 'PVP' | 'PVE' = 'PVP';
    private p1CharType: string = 'shinobi';
    private p2CharType: string = 'samurai';
    private p1Name: string = 'Player 1';
    private difficulty: 'EASY' | 'HARD' = 'EASY';
    private totalRounds: number = 3;
    private p1Wins: number = 0;
    private p2Wins: number = 0;
    private currentRound: number = 1;
    private isRoundTransition: boolean = false;
    private aiState: 'IDLE' | 'CHASE' | 'ATTACK' | 'BLOCK' | 'RETREAT' = 'IDLE';
    private aiStateTimer: number = 0;
    private lastAIAttackTime: number = 0;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data: { mode?: 'PVP' | 'PVE', p1?: string, p2?: string, p1Name?: string, difficulty?: 'EASY' | 'HARD', rounds?: number, isOnlineHost?: boolean, matchId?: string }) {
        if (data.mode) this.gameMode = data.mode;
        if (data.p1) this.p1CharType = data.p1;
        if (data.p2) this.p2CharType = data.p2;
        if (data.p1Name) this.p1Name = data.p1Name;
        if (data.difficulty) this.difficulty = data.difficulty;
        if (data.rounds) this.totalRounds = data.rounds;
        if (data.isOnlineHost) this.isOnlineHost = data.isOnlineHost;
        if (data.matchId) this.matchId = data.matchId;
        
        // Reset states just in case scene restarts
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.currentRound = 1;
        this.isRoundTransition = false;
        this.aiState = 'IDLE';
        this.aiStateTimer = 0;
        this.lastAIAttackTime = 0;
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

            const animConfig = [
                { key: 'idle', tex: 'idle', rate: 8, repeat: -1 },
                { key: 'run', tex: 'run', rate: 12, repeat: -1 },
                { key: 'jump', tex: 'jump', rate: 15, repeat: 0 },
                { key: 'attack_1', tex: 'attack_1', rate: 15, repeat: 0 },
                { key: 'attack_2', tex: 'attack_2', rate: 15, repeat: 0 },
                { key: 'attack_3', tex: 'attack_3', rate: 15, repeat: 0 },
                { key: 'block', tex: 'shield', rate: 12, repeat: 0 },
                { key: 'dead', tex: 'dead', rate: 8, repeat: 0 }
            ];

            animConfig.forEach(cfg => {
                const texKey = `${prefix}_${cfg.tex}`;
                if (this.textures.exists(texKey)) {
                    this.anims.create({
                        key: `${prefix}_${cfg.key}`,
                        frames: this.anims.generateFrameNumbers(texKey),
                        frameRate: cfg.rate,
                        repeat: cfg.repeat
                    });
                }
            });
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

        // Notify Overlay of Match Start explicitly to set names
        window.dispatchEvent(new CustomEvent('matchStarted', { detail: { p1Name: this.p1Name, p2Name: this.gameMode === 'PVE' ? 'CPU' : 'Player 2', totalRounds: this.totalRounds } }));
        window.dispatchEvent(new CustomEvent('roundUpdate', { detail: { round: this.currentRound, p1Wins: this.p1Wins, p2Wins: this.p2Wins } }));
        window.dispatchEvent(new CustomEvent('roundStarted', { detail: { round: this.currentRound } }));

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

        // Initialize MagicBlock BOLT ER Sync
        try {
            console.log('Connected to MagicBlock Ephemeral Rollup RPC...');
            
            if (this.matchId) {
                console.log('Syncing with BOLT Match Entity:', this.matchId);
                this.setupBOLTSubscriptions();
            }

            // Start broadcasting state at 10Hz (100ms) to BOLT Systems
            this.syncTimerEvent = this.time.addEvent({
                delay: 100,
                callback: this.broadcastState,
                callbackScope: this,
                loop: true
            });
            
        } catch(e) {
            console.warn("Could not connect to ER RPC", e);
        }
    }

    private async setupBOLTSubscriptions() {
        if (!this.matchId) return;
        const bolt = (window as any).bolt;
        if (!bolt || !bolt.connection) return;

        const { FindComponentPda } = await import('@magicblock-labs/bolt-sdk');
        const matchEntity = new PublicKey(this.matchId);

        // 1. Subscribe to Remote Player Position (p2)
        const p2PosPda = FindComponentPda({
            componentId: POSITION_COMPONENT_ID,
            entity: matchEntity,
            seed: "p2"
        });

        bolt.connection.onAccountChange(p2PosPda, (accountInfo: any) => {
            const data = accountInfo.data;
            if (data.length >= 24) {
                // Offset 8: x (i64), Offset 16: y (i64)
                // Use DataView for decoding
                const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
                const x = Number(view.getBigInt64(8, true));
                const y = Number(view.getBigInt64(16, true));
                
                // Update remote player position in Phaser
                // Note: We might need to interpolate or smooth this out
                if (this.player2) {
                    this.player2.x = x;
                    this.player2.y = y;
                }
            }
        }, "confirmed");

        // 2. Subscribe to Remote Player Health (p2)
        const p2HealthPda = FindComponentPda({
            componentId: HEALTH_COMPONENT_ID,
            entity: matchEntity,
            seed: "p2"
        });

        bolt.connection.onAccountChange(p2HealthPda, (accountInfo: any) => {
            const data = accountInfo.data;
            if (data.length >= 12) {
                // Offset 8: current (u16), Offset 10: max (u16)
                const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
                const current = view.getUint16(8, true);
                const max = view.getUint16(10, true);

                if (this.player2) {
                    this.player2.hp = current;
                    this.player2.maxHp = max;
                    window.dispatchEvent(new CustomEvent('playerHealthChanged', { 
                        detail: { playerId: 'remote_player', hp: current, maxHp: max } 
                    }));
                }
            }
        }, "confirmed");

        // 3. Subscribe to Remote Player CombatState (p2)
        const p2StatePda = FindComponentPda({
            componentId: COMBAT_STATE_COMPONENT_ID,
            entity: matchEntity,
            seed: "p2"
        });

        bolt.connection.onAccountChange(p2StatePda, (accountInfo: any) => {
            const data = accountInfo.data;
            if (data.length >= 11) {
                // Offset 8: isAttacking (bool), 9: isBlocking (bool), 10: flipX (bool)
                const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
                const isAttacking = view.getUint8(8) !== 0;
                const isBlocking = view.getUint8(9) !== 0;
                const flipX = view.getUint8(10) !== 0;

                if (this.player2) {
                    if (isAttacking && !this.player2.isAttacking) {
                        this.player2.playAttackAnimation();
                    } else if (isBlocking && !this.player2.isBlocking) {
                        this.player2.playBlockAnimation();
                    }
                    this.player2.setFlipX(flipX);
                }
            }
        }, "confirmed");
    }

    private updateTimer() {
        if (this.matchTimer > 0 && !this.player.isDead && !this.player2.isDead && !this.isRoundTransition) {
            this.matchTimer--;
            window.dispatchEvent(new CustomEvent('timerUpdate', { detail: { time: this.matchTimer } }));

            if (this.matchTimer === 0) {
                this.handleTimeUp();
            }
        }
    }

    private handleTimeUp() {
        if (this.isRoundTransition) return;
        
        let winner: 'p1' | 'p2' | 'draw' = 'draw';
        if (this.player.hp > this.player2.hp) {
            winner = 'p1';
        } else if (this.player2.hp > this.player.hp) {
            winner = 'p2';
        }
        
        this.resolveRound(winner);
    }

    private resolveRound(winner: 'p1' | 'p2' | 'draw') {
        this.isRoundTransition = true;

        if (winner === 'p1') this.p1Wins++;
        else if (winner === 'p2') this.p2Wins++;
        
        const winThreshold = Math.floor(this.totalRounds / 2) + 1;
        const matchOver = this.p1Wins >= winThreshold || this.p2Wins >= winThreshold || this.currentRound >= this.totalRounds;

        window.dispatchEvent(new CustomEvent('roundEnded', { detail: { winner, p1Wins: this.p1Wins, p2Wins: this.p2Wins, matchOver } }));
        if (this.matchId) {
            // Apply BOLT match state system instruction
            console.log("BOLT: MatchSystem - apply round outcome");
        }

        if (matchOver) {
            let winnerStr = 'DRAW - TIME UP';
            if (this.p1Wins > this.p2Wins) {
                winnerStr = `${this.p1Name.toUpperCase()} (${this.p1CharType.toUpperCase()}) WINS THE MATCH`;
            } else if (this.p2Wins > this.p1Wins) {
                winnerStr = `${this.gameMode === 'PVE' ? 'CPU' : 'Player 2'} (${this.p2CharType.toUpperCase()}) WINS THE MATCH`;
            }

            try { this.sound.play('victory'); } catch (e) {}

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('gameOver', {
                    detail: {
                        winner: winnerStr,
                        p1Stats: this.player.stats,
                        p2Stats: this.player2.stats
                    }
                }));

                if (this.matchId) {
                    console.log("BOLT: MatchSystem - Game Over! Submitting final Match Result!");
                }
            }, 1500);
        } else {
            // Start next round
            setTimeout(() => {
                this.resetRound();
            }, 3000);
        }
    }

    private resetRound() {
        this.currentRound++;
        this.isRoundTransition = false;
        
        // Reset Logic
        this.matchTimer = 99;
        window.dispatchEvent(new CustomEvent('timerUpdate', { detail: { time: this.matchTimer } }));
        window.dispatchEvent(new CustomEvent('roundUpdate', { detail: { round: this.currentRound, p1Wins: this.p1Wins, p2Wins: this.p2Wins } }));
        window.dispatchEvent(new CustomEvent('roundStarted', { detail: { round: this.currentRound } }));

        if (this.matchId) {
            console.log("BOLT: MatchSystem - starting new round");
        }

        // Reset Players
        this.player.hp = this.player.maxHp;
        this.player.resetState();
        this.player.x = this.scale.width / 2 - 200;
        this.player.y = this.scale.height - 180 - 100;
        this.player.anims.play(`${this.p1CharType}_idle`, true);
        window.dispatchEvent(new CustomEvent('playerHealthChanged', { detail: { playerId: 'local_player', hp: this.player.hp, maxHp: this.player.maxHp } }));

        this.player2.hp = this.player2.maxHp;
        this.player2.resetState();
        this.player2.x = this.scale.width / 2 + 200;
        this.player2.y = this.scale.height - 180 - 100;
        this.player2.anims.play(`${this.p2CharType}_idle`, true);
        window.dispatchEvent(new CustomEvent('playerHealthChanged', { detail: { playerId: 'remote_player', hp: this.player2.hp, maxHp: this.player2.maxHp } }));
    }

    update() {
        if (this.player) {
            this.player.update(undefined, this.moveInput);
        }
        
        if (this.player2) {
            if (this.gameMode === 'PVP') {
                if (this.isOnlineHost) {
                    // Use remote inputs from WebSockets
                    this.player2.update(undefined, this.remoteP2Input);
                } else {
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
                }
            } else if (this.gameMode === 'PVE') {
                this.updateAI();
            }
        }
    }

    private updateAI() {
        if (!this.player || !this.player2 || this.player.isDead || this.player2.isDead || this.matchTimer <= 0 || this.isRoundTransition) return;

        const p1X = this.player.x;
        const p2X = this.player2.x;
        const distance = Math.abs(p1X - p2X);
        const now = this.time.now;

        let aiJoystick = { left: false, right: false, up: false, down: false };

        const retreatThreshold = this.difficulty === 'HARD' ? 95 : 40;
        const chaseThreshold = 120; // Must be larger than minimum physics collision limit (~80)
        const attackRange = 130;    // Range to trigger an attack at

        // AI Tuning Parameters
        const attackChance = this.difficulty === 'HARD' ? 0.8 : 0.6;
        const idleDelay = this.difficulty === 'HARD' ? 100 : 400;
        const attackStateDuration = 250;
        const blockStateDuration = this.difficulty === 'HARD' ? 400 : 700;
        const retreatStateDuration = 300;
        const attackCooldown = this.difficulty === 'HARD' ? 300 : 700;
        const blockCooldown = this.difficulty === 'HARD' ? 200 : 500;

        // State Transitions
        if (this.aiState === 'IDLE') {
            if (distance > chaseThreshold) {
                this.aiState = 'CHASE';
            } else if (now - this.aiStateTimer > idleDelay) {
                this.aiState = Math.random() < attackChance ? 'ATTACK' : 'BLOCK';
                this.aiStateTimer = now;
            }
        } else if (this.aiState === 'CHASE') {
            if (distance <= chaseThreshold) {
                this.aiState = 'IDLE';
                this.aiStateTimer = now;
            }
        } else if (this.aiState === 'ATTACK') {
            if (now - this.aiStateTimer > attackStateDuration) {
                this.aiState = (this.difficulty === 'HARD' && distance < retreatThreshold) ? 'RETREAT' : 'IDLE';
                this.aiStateTimer = now;
            }
        } else if (this.aiState === 'BLOCK') {
            if (now - this.aiStateTimer > blockStateDuration) {
                this.aiState = 'IDLE';
                this.aiStateTimer = now;
            }
        } else if (this.aiState === 'RETREAT') {
            if (distance > chaseThreshold + 50 || now - this.aiStateTimer > retreatStateDuration) {
                this.aiState = 'IDLE';
                this.aiStateTimer = now;
            }
        }

        // State Actions
        switch (this.aiState) {
            case 'CHASE':
                if (p2X > p1X) aiJoystick.left = true;
                else aiJoystick.right = true;
                break;
            case 'RETREAT':
                if (p2X > p1X) aiJoystick.right = true; // Run away to the right
                else aiJoystick.left = true;
                break;
            case 'ATTACK':
                if (distance <= attackRange && now - this.lastAIAttackTime > attackCooldown) {
                    this.player2.playAttackAnimation();
                    this.lastAIAttackTime = now;
                }
                break;
            case 'BLOCK':
                if (now - this.lastAIAttackTime > blockCooldown) {
                    this.player2.playBlockAnimation();
                    this.lastAIAttackTime = now;
                }
                break;
            case 'IDLE':
            default:
                // Stand still
                break;
        }

        // Apply movement/physics payload
        this.player2.update(undefined, aiJoystick);
    }

    private setupDOMEventListeners() {
        // Disconnect old listeners to prevent memory leaks if scene restarts
        window.removeEventListener('joystickInput', this.handleJoystickInput as any);
        window.removeEventListener('playerAction', this.handlePlayerAction as any);
        window.removeEventListener('playerAudio', this.handlePlayerAudio as any);

        window.addEventListener('joystickInput', this.handleJoystickInput as any);
        window.addEventListener('playerAction', this.handlePlayerAction as any);
        window.addEventListener('playerAudio', this.handlePlayerAudio as any);
        
        this.events.on(Phaser.Scenes.Events.DESTROY, () => {
            window.removeEventListener('joystickInput', this.handleJoystickInput as any);
            window.removeEventListener('playerAction', this.handlePlayerAction as any);
            window.removeEventListener('playerAudio', this.handlePlayerAudio as any);
        });
    }

    private async broadcastState() {
        if (!this.matchId || !this.player || !this.player2) return;

        const bolt = (window as any).bolt;
        if (!bolt || !bolt.wallet || !bolt.wallet.publicKey) return;

        // Apply BOLT MovementSystem instruction for player 1 if moving
        if (this.moveInput.left || this.moveInput.right || this.moveInput.up || this.moveInput.down) {
            try {
                const worldPda = FindWorldPda({ worldId: WORLD_ID });
                const dx = this.moveInput.left ? -1 : (this.moveInput.right ? 1 : 0);
                const dy = this.moveInput.up ? -1 : (this.moveInput.down ? 1 : 0);
                
                const { transaction } = await ApplySystem({
                    authority: bolt.wallet.publicKey,
                    systemId: MOVEMENT_SYSTEM_ID,
                    world: worldPda,
                    entities: [
                        {
                            entity: new PublicKey(this.matchId),
                            components: [{ componentId: POSITION_COMPONENT_ID, seed: "p1" }]
                        }
                    ],
                    args: Buffer.from([dx as number, dy as number])
                });

                // Dispatch transaction to ER
                await bolt.wallet.sendTransaction(transaction, bolt.connection);
            } catch (err) {
                console.warn("BOLT Movement dispatch failed:", err);
            }
        }
    }

    private handleJoystickInput = (e: CustomEvent<{ left: boolean, right: boolean, up: boolean, down: boolean }>) => {
        this.moveInput = e.detail;
    };

    private async handlePlayerAction(e: CustomEvent<{ action: string }>) {
        if (!this.player || !this.matchId) return;
        
        const bolt = (window as any).bolt;
        if (!bolt || !bolt.wallet || !bolt.wallet.publicKey) return;

        if (e.detail.action === 'attack') {
            this.player.playAttackAnimation();
            
            // Dispatch CombatSystem (Attack)
            try {
                const worldPda = FindWorldPda({ worldId: WORLD_ID });
                const { transaction } = await ApplySystem({
                    authority: bolt.wallet.publicKey,
                    systemId: COMBAT_SYSTEM_ID,
                    world: worldPda,
                    entities: [
                        {
                            entity: new PublicKey(this.matchId),
                            components: [
                                { componentId: COMBAT_STATE_COMPONENT_ID, seed: "p1" }, // attacker_state
                                { componentId: POSITION_COMPONENT_ID, seed: "p1" },     // attacker_pos
                                { componentId: HEALTH_COMPONENT_ID, seed: "p2" },       // target_health
                                { componentId: POSITION_COMPONENT_ID, seed: "p2" },     // target_pos
                                { componentId: COMBAT_STATE_COMPONENT_ID, seed: "p2" }, // target_state
                            ]
                        }
                    ],
                    args: Buffer.from([1]) // 1 = Attack
                });
                await bolt.wallet.sendTransaction(transaction, bolt.connection);
            } catch (err) {
                console.warn("BOLT Combat (Attack) dispatch failed:", err);
            }

        } else if (e.detail.action === 'block') {
            this.player.playBlockAnimation();

            // Dispatch CombatSystem (Block)
            try {
                const worldPda = FindWorldPda({ worldId: WORLD_ID });
                const { transaction } = await ApplySystem({
                    authority: bolt.wallet.publicKey,
                    systemId: COMBAT_SYSTEM_ID,
                    world: worldPda,
                    entities: [
                        {
                            entity: new PublicKey(this.matchId),
                            components: [
                                { componentId: COMBAT_STATE_COMPONENT_ID, seed: "p1" }, // attacker_state
                                { componentId: POSITION_COMPONENT_ID, seed: "p1" },     // attacker_pos
                                { componentId: HEALTH_COMPONENT_ID, seed: "p2" },       // target_health
                                { componentId: POSITION_COMPONENT_ID, seed: "p2" },     // target_pos
                                { componentId: COMBAT_STATE_COMPONENT_ID, seed: "p2" }, // target_state
                            ]
                        }
                    ],
                    args: Buffer.from([2]) // 2 = Block
                });
                await bolt.wallet.sendTransaction(transaction, bolt.connection);
            } catch (err) {
                console.warn("BOLT Combat (Block) dispatch failed:", err);
            }
        }
    };

    private handlePlayerAudio = (e: CustomEvent<any>) => {
        // Audio doesn't need to be broadcast to ER
    };

    private handleAttackHit(attacker: Player, target: Player) {
        if (attacker.isAttacking && !attacker.hasHit && !attacker.isDead && !target.isDead && !this.isRoundTransition) {
            attacker.hasHit = true; // Ensure they only hit once per attack animation
            const actualDamage = target.takeDamage(10); // Hardcoded 10 damage for now
            attacker.stats.damageDealt += actualDamage;

            // Check for death
            if (target.hp <= 0 && target.isDead) {
                const winner = attacker.id === 'local_player' ? 'p1' : 'p2';
                this.resolveRound(winner);
            }
        }
    }
}
