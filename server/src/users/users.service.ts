import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../database/schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByWallet(walletAddress: string): Promise<User | null> {
    return this.userModel.findOne({ walletAddress }).exec();
  }

  async createOrUpdate(walletAddress: string, userName: string): Promise<User> {
    const existingUser = await this.userModel.findOne({ walletAddress }).exec();
    
    if (existingUser) {
      existingUser.userName = userName;
      return existingUser.save();
    }

    const newUser = new this.userModel({ walletAddress, userName });
    return newUser.save();
  }
}
