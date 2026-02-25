import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':walletAddress')
  async getUser(@Param('walletAddress') walletAddress: string) {
    const user = await this.usersService.findByWallet(walletAddress);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Post()
  async saveUser(@Body() body: { walletAddress: string; userName: string }) {
    if (!body.walletAddress || !body.userName) {
        throw new Error("Missing required fields");
    }
    return this.usersService.createOrUpdate(body.walletAddress, body.userName);
  }
}
