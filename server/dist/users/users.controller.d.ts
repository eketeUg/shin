import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getUser(walletAddress: string): Promise<import("../database/schemas/user.schema").User>;
    saveUser(body: {
        walletAddress: string;
        userName: string;
    }): Promise<import("../database/schemas/user.schema").User>;
}
