import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

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

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export class AuthService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeSchema();
  }

  private async initializeSchema() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        permissions JSONB,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `;

    try {
      await this.pool.query(query);
    } catch (error) {
      console.error('Error initializing auth schema:', error);
    }
  }

  async register(email: string, password: string, name: string, role: string = 'viewer'): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, name, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, created_at
    `;

    try {
      const result = await this.pool.query(query, [email, name, passwordHash, role]);
      return result.rows[0];
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') { // Unique constraint violation
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const query = `
      SELECT id, email, name, role, password_hash, created_at
      FROM users
      WHERE email = $1 AND is_active = true
    `;

    const result = await this.pool.query(query, [email]);

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = this.generateToken(user);
    delete user.password_hash;

    return { user, token };
  }

  generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (_error) {
      throw new Error('Invalid or expired token');
    }
  }

  async generateApiKey(userId: number, name: string, permissions?: object): Promise<string> {
    const apiKey = this.generateRandomKey();
    const keyHash = await bcrypt.hash(apiKey, 10);

    const query = `
      INSERT INTO api_keys (user_id, key_hash, name, permissions)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    await this.pool.query(query, [userId, keyHash, name, permissions || {}]);

    return apiKey;
  }

  private generateRandomKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'cicd_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  async verifyApiKey(apiKey: string): Promise<TokenPayload | null> {
    const query = `
      SELECT ak.*, u.email, u.role
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE u.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      const isValid = await bcrypt.compare(apiKey, row.key_hash);
      if (isValid) {
        // Update last used
        await this.pool.query(
          'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
          [row.id]
        );

        return {
          userId: row.user_id,
          email: row.email,
          role: row.role
        };
      }
    }

    return null;
  }

  async logAudit(
    userId: number,
    action: string,
    resource?: string,
    details?: object,
    req?: Request
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    const userAgent = req?.headers['user-agent'];

    await this.pool.query(query, [
      userId,
      action,
      resource,
      details || {},
      ipAddress,
      userAgent
    ]);
  }
}

// Middleware for authentication
export function authenticate(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
      }

      let user: TokenPayload | null = null;

      if (authHeader.startsWith('Bearer ')) {
        // JWT token authentication
        const token = authHeader.substring(7);
        user = authService.verifyToken(token);
      } else if (authHeader.startsWith('ApiKey ')) {
        // API key authentication
        const apiKey = authHeader.substring(7);
        user = await authService.verifyApiKey(apiKey);
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid authentication credentials' });
      }

      req.user = user;
      next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return res.status(401).json({ error: message });
    }
  };
}

// Role-based access control middleware
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Permission-based middleware
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check specific permissions based on role
    const rolePermissions: Record<string, string[]> = {
      developer: [
        'pipelines.view',
        'pipelines.trigger',
        'metrics.view',
        'analytics.view',
        'alerts.view'
      ],
      viewer: [
        'pipelines.view',
        'metrics.view',
        'analytics.view'
      ]
    };

    const userPermissions = rolePermissions[req.user.role] || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: `Permission '${permission}' required` });
    }

    next();
  };
}

// Rate limiting middleware
interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function rateLimit(options: RateLimitOptions) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.userId?.toString() || req.ip || 'anonymous';
    const now = Date.now();

    const record = requests.get(key);

    if (!record || now > record.resetTime) {
      requests.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter
      });
    }

    record.count++;
    next();
  };
}