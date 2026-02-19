import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
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

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.gameService.removePlayer(client.id);
  }

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
  handlePlayerInput(client: Socket, @MessageBody() input: { x: number; y: number }) {
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

    players.forEach(target => {
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
                    attackerId: attackerId
                });

                if (updatedTarget.hp <= 0) {
                   this.server.emit('playerDied', { id: target.id, killerId: attackerId });
                   // Optional: Respawn logic or Game Over
                }
            }
        }
    });
  }
}
