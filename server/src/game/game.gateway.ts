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

          // Simple random movement
          const moveX = Math.random() > 0.5 ? 10 : -10;
          const moveY = Math.random() > 0.5 ? 10 : -10;
          
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
    // Logic for attack (hitbox check, etc.)
    // For now, just broadcast animation
    this.server.emit('playerAttacked', { id: client.id });
  }
}
