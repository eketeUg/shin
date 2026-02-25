import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Match tracking for Spectator Mode
  private activeMatches = new Map<string, any>();
  private matchmakingQueue: { socket: Socket; data: any }[] = [];

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.gameService.removePlayer(client.id);

    // Remove from matchmaking queue if present
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (p) => p.socket.id !== client.id,
    );

    // If acting as a host, clean up their match
    let matchEnded = false;
    for (const [mid, match] of this.activeMatches.entries()) {
      if (match.hostId === client.id) {
        this.activeMatches.delete(mid);
        this.server.to(`match_${mid}`).emit('match_ended');
        matchEnded = true;
        console.log(
          `Match ${mid} ended because host ${client.id} disconnected.`,
        );
      }
    }

    if (matchEnded) {
      this.server.emit(
        'active_matches_updated',
        Array.from(this.activeMatches.values()),
      );
    }
  }

  // ==========================================
  // SPECTATOR MODE: RELAY LOGIC
  // ==========================================

  @SubscribeMessage('create_match')
  handleCreateMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchData: any,
  ) {
    const matchId = 'local_' + Math.random().toString(36).substring(2, 9); // Use unique ID for all matches
    this.activeMatches.set(matchId, {
      hostId: client.id,
      matchId: matchId,
      hostName: matchData?.hostName || 'Unknown Player',
      p1Type: matchData?.p1Type || 'Unknown',
      p2Type: matchData?.p2Type || 'Unknown',
      mode: matchData?.mode || 'PvE',
      viewers: 0,
      encryptedWagers: [],
    });

    console.log(`Match created: ${matchId}`);
    // Broadcast to everyone that there's a new match to watch
    this.server.emit(
      'active_matches_updated',
      Array.from(this.activeMatches.values()),
    );

    return { matchId };
  }

  @SubscribeMessage('host_sync_frame')
  handleHostSyncFrame(
    @ConnectedSocket() client: Socket,
    @MessageBody() frameData: any,
  ) {
    // Find the match for this host
    let matchId: string | null = null;
    for (const [mid, match] of this.activeMatches.entries()) {
      if (match.hostId === client.id) {
        matchId = mid;
        break;
      }
    }

    if (matchId) {
      // Broadcast immediately to the specific spectator room, avoiding full server broadcast
      client.broadcast
        .to(`match_${matchId}`)
        .emit('spectator_sync_frame', frameData);
    }
  }

  @SubscribeMessage('host_fire_event')
  handleHostFireEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() eventData: any,
  ) {
    // Find the match for this host
    let matchId: string | null = null;
    for (const [mid, match] of this.activeMatches.entries()) {
      if (match.hostId === client.id) {
        matchId = mid;
        break;
      }
    }

    if (matchId) {
      client.broadcast
        .to(`match_${matchId}`)
        .emit('spectator_fire_event', eventData);

      // If the match is over, Oracle must trigger the Settlement phase
      if (
        eventData.type === 'match_event' &&
        eventData.data?.event === 'gameOver'
      ) {
        console.log(
          `[ORACLE] Match ${matchId} concluded. Triggering Arcium SettleMatch...`,
        );
        this.processMatchSettlement(matchId, eventData.data.detail.winner);
      }
    }
  }

  @SubscribeMessage('place_encrypted_bet')
  handlePlaceEncryptedBet(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    betData: {
      matchId: string;
      encryptedPrediction: string;
      amount: number;
      spectatorPubKey: string;
    },
  ) {
    const { matchId, encryptedPrediction, amount, spectatorPubKey } = betData;
    if (this.activeMatches.has(matchId)) {
      const match = this.activeMatches.get(matchId);
      match.encryptedWagers.push({
        spectatorPubKey,
        encryptedPrediction,
        amount,
      });
      this.activeMatches.set(matchId, match);
      console.log(
        `[ARCIUM] Encrypted wager placed for Match ${matchId} by ${spectatorPubKey}. Pool size: ${match.encryptedWagers.length}`,
      );
      return { success: true };
    }
    return { success: false, message: 'Match not found' };
  }

  private processMatchSettlement(matchId: string, winner: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    console.log(`[ORACLE] Winner for ${matchId} is ${winner}.`);
    console.log(
      `[ORACLE] Forwarding ${match.encryptedWagers.length} encrypted predictions to the Arcium Network for autonomous decryption and payout...`,
    );

    // Simulate constructing the transaction to call the TallyBets instruction with the aggregated ciphertexts
    const p1WagersArray = match.encryptedWagers
      .filter((w: any) => w.prediction === 'P1')
      .map((w: any) => w.encryptedPrediction);
    const p2WagersArray = match.encryptedWagers
      .filter((w: any) => w.prediction === 'P2')
      .map((w: any) => w.encryptedPrediction);

    console.log(
      `[ORACLE] Encrypted Transaction P1 Count: ${p1WagersArray.length}`,
    );
    console.log(
      `[ORACLE] Encrypted Transaction P2 Count: ${p2WagersArray.length}`,
    );
    console.log(`[ORACLE] Submitting transaction to MXE Cluster...`);

    // Remove the match from active matches so it no longer appears in Live Fights
    this.activeMatches.delete(matchId);
    this.server.emit(
      'active_matches_updated',
      Array.from(this.activeMatches.values()),
    );
    this.server.to(`match_${matchId}`).emit('match_ended');

    // Mock completion delay
    setTimeout(() => {
      console.log(`[ARCIUM] TallyBets FHE completed successfully.`);
      console.log(`[ARCIUM] Payout distributed to Winners!`);
    }, 3500);
  }

  @SubscribeMessage('get_active_matches')
  handleGetActiveMatches(@ConnectedSocket() client: Socket) {
    client.emit(
      'active_matches_updated',
      Array.from(this.activeMatches.values()),
    );
  }

  @SubscribeMessage('join_spectator')
  handleJoinSpectator(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ) {
    if (this.activeMatches.has(matchId)) {
      client.join(`match_${matchId}`);
      const match = this.activeMatches.get(matchId);
      match.viewers++;
      this.activeMatches.set(matchId, match);
      console.log(`Client ${client.id} joined spectator room match_${matchId}`);

      // Notify lobby about viewer count update
      this.server.emit(
        'active_matches_updated',
        Array.from(this.activeMatches.values()),
      );
      return { success: true };
    }
    return { success: false, message: 'Match not found' };
  }

  @SubscribeMessage('leave_spectator')
  handleLeaveSpectator(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ) {
    client.leave(`match_${matchId}`);
    if (this.activeMatches.has(matchId)) {
      const match = this.activeMatches.get(matchId);
      match.viewers = Math.max(0, match.viewers - 1);
      this.activeMatches.set(matchId, match);
      this.server.emit(
        'active_matches_updated',
        Array.from(this.activeMatches.values()),
      );
      console.log(`Client ${client.id} left spectator room match_${matchId}`);
    }
  }

  // ==========================================
  // ONLINE PVP: MATCHMAKING & RELAY
  // ==========================================

  @SubscribeMessage('join_matchmaking')
  handleJoinMatchmaking(
    @ConnectedSocket() client: Socket,
    @MessageBody() userData: any,
  ) {
    console.log(`Client ${client.id} joined matchmaking queue.`);

    // Prevent double queueing
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (p) => p.socket.id !== client.id,
    );

    // Check if there is already someone waiting
    if (this.matchmakingQueue.length > 0) {
      // Found an opponent!
      const opponent = this.matchmakingQueue.shift()!;

      // opponent will be Host (P1), client will be Client (P2)
      const matchId = 'online_' + Math.random().toString(36).substring(2, 9);

      // Create the match tracking structure needed for spectators to also watch this match!
      this.activeMatches.set(matchId, {
        hostId: null, // Host hasn't connected their GameScene socket yet to bind
        matchId: matchId,
        hostName: opponent.data?.username || 'Player 1',
        p1Type: opponent.data?.charType || 'Shinobi',
        p2Type: userData?.charType || 'Samurai',
        mode: 'Online PvP',
        viewers: 0,
        encryptedWagers: [],
      });

      this.server.emit(
        'active_matches_updated',
        Array.from(this.activeMatches.values()),
      );

      // Notify Host (P1)
      opponent.socket.emit('match_found', {
        role: 'P1',
        matchId: matchId,
        opponentId: client.id,
        opponentName: userData?.username || 'Player 2',
        opponentChar: userData?.charType || 'Samurai',
        myChar: opponent.data?.charType || 'Shinobi',
      });

      // Notify Client (P2)
      client.emit('match_found', {
        role: 'P2',
        matchId: matchId,
        opponentId: opponent.socket.id,
        opponentName: opponent.data?.username || 'Player 1',
        opponentChar: opponent.data?.charType || 'Shinobi',
        myChar: userData?.charType || 'Samurai',
      });

      // Put P2 in the specific room so it gets all host frames for rendering instantly
      client.join(`match_${matchId}`);

      console.log(
        `Matchmaking successful! Created match ${matchId} between ${opponent.socket.id} (P1) and ${client.id} (P2)`,
      );
    } else {
      // No one waiting, join queue
      this.matchmakingQueue.push({ socket: client, data: userData });
    }
  }

  @SubscribeMessage('cancel_matchmaking')
  handleCancelMatchmaking(@ConnectedSocket() client: Socket) {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (p) => p.socket.id !== client.id,
    );
    console.log(`Client ${client.id} left matchmaking queue.`);
  }

  @SubscribeMessage('host_bind_match')
  handleHostBindMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ) {
    if (this.activeMatches.has(matchId)) {
      const match = this.activeMatches.get(matchId);
      match.hostId = client.id;
      this.activeMatches.set(matchId, match);
      console.log(
        `Host ${client.id} successfully bound to remote match ${matchId}`,
      );
      this.server.emit(
        'active_matches_updated',
        Array.from(this.activeMatches.values()),
      );
    }
  }

  @SubscribeMessage('p2_input')
  handleP2Input(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; input: any },
  ) {
    if (this.activeMatches.has(data.matchId)) {
      const match = this.activeMatches.get(data.matchId);
      // Forward P2 input directly to the Host (P1) using their bound socket ID.
      if (match.hostId) {
        this.server.to(match.hostId).emit('host_p2_input', data.input);
      }
    }
  }

  // ==========================================
  // LEGACY SERVER-AUTHORITATIVE MODE LOGIC
  // ==========================================

  @SubscribeMessage('join_game')
  handleJoinGame(client: Socket, @MessageBody() data: any) {
    const player = this.gameService.addPlayer(client.id);
    client.emit('currentPlayers', this.gameService.getAllPlayers());
    client.broadcast.emit('newPlayer', player);

    // Simple PvE trigger: if 1 player, add bot after 3 seconds
    setTimeout(() => {
      if (this.gameService.getAllPlayers().length === 1) {
        const bot = this.gameService.addBot();
        this.server.emit('newPlayer', bot);
        // Start bot loop
        this.startBotLoop(bot.id);
      }
    }, 3000);
  }

  private startBotLoop(botId: string) {
    setInterval(() => {
      const bot = this.gameService.getPlayer(botId);
      if (!bot) return;

      // Simple Side-Scroller AI
      const moveX = Math.random() > 0.5 ? 10 : -10;
      let moveY = 0; // Gravity handles falling, but simplistic server update needs to be careful

      // Random Jump
      if (Math.random() > 0.95 && bot.y >= 300) {
        moveY = -20;
      } else if (bot.y < 500) {
        moveY = 5; // Fake gravity
      }

      this.gameService.movePlayer(botId, bot.x + moveX, bot.y + moveY);
      this.server.emit('playerMoved', { id: botId, x: bot.x, y: bot.y });

      // Random attack
      if (Math.random() > 0.9) {
        this.server.emit('playerAttacked', { id: botId });
      }
    }, 500); // Update every 500ms
  }

  @SubscribeMessage('playerInput')
  handlePlayerInput(
    client: Socket,
    @MessageBody() input: { x: number; y: number },
  ) {
    this.gameService.movePlayer(client.id, input.x, input.y);
    this.server.emit('playerMoved', { id: client.id, x: input.x, y: input.y });
  }

  @SubscribeMessage('playerAttack')
  handlePlayerAttack(client: Socket) {
    const attackerId = client.id;
    const attacker = this.gameService.getPlayer(attackerId);

    if (!attacker) return;

    // Broadcast attack animation immediately
    this.server.emit('playerAttacked', { id: attackerId });

    // Hit Detection Logic
    const players = this.gameService.getAllPlayers();
    const ATTACK_RANGE = 70; // pixels
    const DAMAGE = 10;

    players.forEach((target) => {
      if (target.id === attackerId) return; // Don't hit self
      if (target.hp <= 0) return; // Don't beat a dead horse

      // Calculate distance
      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= ATTACK_RANGE) {
        // Apply Damage
        const updatedTarget = this.gameService.damagePlayer(target.id, DAMAGE);

        if (updatedTarget) {
          this.server.emit('playerDamaged', {
            id: target.id,
            hp: updatedTarget.hp,
            maxHp: updatedTarget.maxHp,
            damage: DAMAGE,
            attackerId: attackerId,
          });

          if (updatedTarget.hp <= 0) {
            this.server.emit('playerDied', {
              id: target.id,
              killerId: attackerId,
            });
            // Optional: Respawn logic or Game Over
          }
        }
      }
    });
  }
}
