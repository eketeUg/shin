import { Model } from 'mongoose';
import { User, UserDocument } from '../database/schemas/user.schema';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    findByWallet(walletAddress: string): Promise<User | null>;
    createOrUpdate(walletAddress: string, userName: string): Promise<User>;
}
