import { Injectable } from '@nestjs/common';

interface Player {
  id: string;
  x: number;
  y: number;
  hp: number;
  isBot?: boolean;
}

@Injectable()
export class GameService {
  private players: Map<string, Player> = new Map();

  addPlayer(playerId: string, isBot = false) {
    const player: Player = {
      id: playerId,
      x: isBot ? 600 : 400, // Bots start on the right
      y: 300,
      hp: 100,
      isBot,
    };
    this.players.set(playerId, player);
    return player;
  }

  addBot() {
    const botId = `bot_${Date.now()}`;
    return this.addPlayer(botId, true);
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
  }

  getPlayer(playerId: string) {
    return this.players.get(playerId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  movePlayer(playerId: string, x: number, y: number) {
    const player = this.players.get(playerId);
    if (player) {
      player.x = x;
      player.y = y;
      return player;
    }
    return null;
  }
}
