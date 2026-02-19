import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly gameService;
    server: Server;
    constructor(gameService: GameService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinGame(client: Socket, data: any): void;
    private startBotLoop;
    handlePlayerInput(client: Socket, input: {
        x: number;
        y: number;
    }): void;
    handlePlayerAttack(client: Socket): void;
}
