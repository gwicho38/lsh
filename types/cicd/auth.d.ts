import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
interface User {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'developer' | 'viewer';
    created_at: Date;
    last_login?: Date;
}
interface TokenPayload {
    userId: number;
    email: string;
    role: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}
export declare class AuthService {
    private pool;
    constructor(pool: Pool);
    private initializeSchema;
    register(email: string, password: string, name: string, role?: string): Promise<User>;
    login(email: string, password: string): Promise<{
        user: User;
        token: string;
    }>;
    generateToken(user: User): string;
    verifyToken(token: string): TokenPayload;
    generateApiKey(userId: number, name: string, permissions?: object): Promise<string>;
    private generateRandomKey;
    verifyApiKey(apiKey: string): Promise<TokenPayload | null>;
    logAudit(userId: number, action: string, resource?: string, details?: object, req?: Request): Promise<void>;
}
export declare function authenticate(authService: AuthService): (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare function authorize(...allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => any;
export declare function requirePermission(permission: string): (req: Request, res: Response, next: NextFunction) => any;
interface RateLimitOptions {
    windowMs: number;
    max: number;
}
export declare function rateLimit(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => any;
export {};
