/**
 * LSH SaaS API Routes
 * RESTful API endpoints for the SaaS platform
 */

import type { Request, Response, NextFunction, Application } from 'express';
import rateLimit from 'express-rate-limit';
import { authService, verifyToken } from '../lib/saas-auth.js';
import { organizationService, teamService } from '../lib/saas-organizations.js';
import { billingService } from '../lib/saas-billing.js';
import { auditLogger, getIpFromRequest } from '../lib/saas-audit.js';
import { emailService } from '../lib/saas-email.js';
import { secretsService } from '../lib/saas-secrets.js';
import type { AuthenticatedRequest } from '../lib/saas-types.js';
import { getErrorMessage, getAuthenticatedUser } from '../lib/saas-types.js'; // eslint-disable-line no-duplicate-imports

/**
 * Rate Limiters for different endpoint types
 */
// Strict rate limiter for authentication endpoints (5 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiter for write operations (30 requests per 15 minutes)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many write requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware: Authenticate user from JWT token
 * Security is enforced by cryptographic JWT verification and database lookup,
 * not by input validation alone.
 */
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    // Early rejection for malformed requests (not a security boundary)
    // Real security comes from JWT cryptographic verification below
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization token provided',
        },
      });
    }

    const token = authHeader.substring(7).trim();

    // SECURITY BOUNDARY: Cryptographic JWT verification
    // This uses server-side secret to verify token authenticity
    // User cannot bypass this by manipulating input
    const { userId } = verifyToken(token);

    const user = await authService.getUserById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error: unknown) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: getErrorMessage(error) || 'Authentication failed',
      },
    });
  }
}

/**
 * Middleware: Check organization membership
 */
export async function requireOrganizationMembership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Only use organizationId from URL params to prevent bypass attacks
    const organizationId = req.params.organizationId;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Organization ID required' },
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const role = await organizationService.getUserRole(organizationId, getAuthenticatedUser(req).id);
    if (!role) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization' },
      });
    }

    req.organizationId = organizationId;
    next();
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
    });
  }
}

/**
 * Setup SaaS API routes
 */
export function setupSaaSApiRoutes(app: Application) {
  // ============================================================================
  // AUTH ROUTES
  // ============================================================================

  /**
   * POST /api/v1/auth/signup
   * Sign up a new user
   */
  app.post('/api/v1/auth/signup', authLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Input sanitization (not a security boundary)
      // Real validation happens in authService.signup()
      if (typeof email !== 'string' || typeof password !== 'string' ||
          email.trim().length === 0 || password.length < 8) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Valid email and password (min 8 chars) required' },
        });
      }

      // Basic email format validation (fail-fast for obviously bad input)
      // Real security: authService validates and prevents duplicate emails in database
      if (email.length > 254 || // RFC 5321 max email length
          !email.includes('@') ||
          email.indexOf('@') !== email.lastIndexOf('@') || // Exactly one @
          email.startsWith('@') ||
          email.endsWith('@') ||
          email.split('@')[1]?.includes('.') === false) { // Domain has a dot
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Invalid email format' },
        });
      }

      // SECURITY BOUNDARY: authService handles:
      // - Password hashing with bcrypt
      // - Database uniqueness constraints
      // - Email verification token generation
      const { user, verificationToken } = await authService.signup({
        email,
        password,
        firstName,
        lastName,
      });

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationToken, user.firstName || undefined);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
          },
          message: 'Verification email sent',
        },
      });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: { code: getErrorMessage(error).includes('ALREADY_EXISTS') ? 'EMAIL_ALREADY_EXISTS' : 'INTERNAL_ERROR', message: getErrorMessage(error) },
      });
    }
  });

  /**
   * POST /api/v1/auth/login
   * Login with email and password
   */
  app.post('/api/v1/auth/login', authLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Input sanitization (not a security boundary)
      // Real authentication happens in authService.login() via bcrypt password comparison
      if (typeof email !== 'string' || typeof password !== 'string' ||
          email.trim().length === 0 || password.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Email and password required' },
        });
      }

      // SECURITY BOUNDARY: authService.login() performs:
      // - Database lookup for user by email
      // - bcrypt password verification (cryptographic)
      // - Session token generation with server-side secret
      const ipAddress = getIpFromRequest(req);
      const session = await authService.login({ email, password }, ipAddress);

      res.json({
        success: true,
        data: session,
      });
    } catch (error: unknown) {
      const statusCode = getErrorMessage(error).includes('EMAIL_NOT_VERIFIED') ? 403 : 401;
      res.status(statusCode).json({
        success: false,
        error: { code: getErrorMessage(error) || 'INVALID_CREDENTIALS', message: getErrorMessage(error) },
      });
    }
  });

  /**
   * POST /api/v1/auth/verify-email
   * Verify email address
   */
  app.post('/api/v1/auth/verify-email', authLimiter, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      // Input sanitization (not a security boundary)
      // Real verification happens in authService.verifyEmail() via database lookup
      if (typeof token !== 'string' || token.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Valid token required' },
        });
      }

      // SECURITY BOUNDARY: authService.verifyEmail() performs:
      // - Database lookup for verification token
      // - Token expiry validation
      // - User status update in database
      const user = await authService.verifyEmail(token);

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.firstName || undefined);

      res.json({
        success: true,
        data: { user, message: 'Email verified successfully' },
      });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: getErrorMessage(error) },
      });
    }
  });

  /**
   * POST /api/v1/auth/resend-verification
   * Resend verification email
   */
  app.post('/api/v1/auth/resend-verification', authLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const token = await authService.resendVerificationEmail(email);
      const user = await authService.getUserByEmail(email);

      if (user) {
        await emailService.sendVerificationEmail(email, token, user.firstName || undefined);
      }

      res.json({
        success: true,
        data: { message: 'Verification email sent' },
      });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
      });
    }
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  app.post('/api/v1/auth/refresh', authLimiter, async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Refresh token required' },
        });
      }

      const tokens = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error: unknown) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: getErrorMessage(error) },
      });
    }
  });

  /**
   * GET /api/v1/auth/me
   * Get current user
   */
  app.get('/api/v1/auth/me', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: { user: req.user },
    });
  });

  // ============================================================================
  // ORGANIZATION ROUTES
  // ============================================================================

  /**
   * POST /api/v1/organizations
   * Create a new organization
   */
  app.post('/api/v1/organizations', writeLimiter, authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, slug } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Organization name required' },
        });
      }

      const organization = await organizationService.createOrganization({
        name,
        slug,
        ownerId: getAuthenticatedUser(req).id,
      });

      res.json({
        success: true,
        data: { organization },
      });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
      });
    }
  });

  /**
   * GET /api/v1/organizations/:organizationId
   * Get organization details
   */
  app.get(
    '/api/v1/organizations/:organizationId',
    authenticateUser,
    requireOrganizationMembership,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const organization = await organizationService.getOrganizationById(
          req.params.organizationId
        );

        if (!organization) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Organization not found' },
          });
        }

        // Get usage summary
        const usage = await organizationService.getUsageSummary(req.params.organizationId);

        res.json({
          success: true,
          data: { organization, usage },
        });
      } catch (error: unknown) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  /**
   * GET /api/v1/organizations/:organizationId/members
   * Get organization members
   */
  app.get(
    '/api/v1/organizations/:organizationId/members',
    authenticateUser,
    requireOrganizationMembership,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const members = await organizationService.getOrganizationMembers(
          req.params.organizationId
        );

        res.json({
          success: true,
          data: { members },
        });
      } catch (error: unknown) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  /**
   * POST /api/v1/organizations/:organizationId/members
   * Add member to organization
   */
  app.post(
    '/api/v1/organizations/:organizationId/members',
    writeLimiter,
    authenticateUser,
    requireOrganizationMembership,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Check permission
        const canInvite = await organizationService.hasPermission(
          req.params.organizationId,
          getAuthenticatedUser(req).id,
          'canInviteMembers'
        );

        if (!canInvite) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'No permission to invite members' },
          });
        }

        const { userId, role } = req.body;

        const member = await organizationService.addMember({
          organizationId: req.params.organizationId,
          userId,
          role: role || 'member',
          invitedBy: getAuthenticatedUser(req).id,
        });

        res.json({
          success: true,
          data: { member },
        });
      } catch (error: unknown) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  // ============================================================================
  // TEAM ROUTES
  // ============================================================================

  /**
   * POST /api/v1/organizations/:organizationId/teams
   * Create a team
   */
  app.post(
    '/api/v1/organizations/:organizationId/teams',
    writeLimiter,
    authenticateUser,
    requireOrganizationMembership,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name, slug, description } = req.body;

        if (!name) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Team name required' },
          });
        }

        const team = await teamService.createTeam(
          {
            organizationId: req.params.organizationId,
            name,
            slug,
            description,
          },
          getAuthenticatedUser(req).id
        );

        res.json({
          success: true,
          data: { team },
        });
      } catch (error: unknown) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  /**
   * GET /api/v1/organizations/:organizationId/teams
   * Get organization teams
   */
  app.get(
    '/api/v1/organizations/:organizationId/teams',
    authenticateUser,
    requireOrganizationMembership,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const teams = await teamService.getOrganizationTeams(req.params.organizationId);

        res.json({
          success: true,
          data: { teams },
        });
      } catch (error: unknown) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  // ============================================================================
  // SECRETS ROUTES
  // ============================================================================

  /**
   * POST /api/v1/teams/:teamId/secrets
   * Create a new secret
   */
  app.post('/api/v1/teams/:teamId/secrets', writeLimiter, authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { environment, key, value, description, tags, rotationIntervalDays } = req.body;

      if (!environment || !key || !value) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Environment, key, and value required' },
        });
      }

      const secret = await secretsService.createSecret({
        teamId: req.params.teamId,
        environment,
        key,
        value,
        description,
        tags,
        rotationIntervalDays,
        createdBy: getAuthenticatedUser(req).id,
      });

      res.json({
        success: true,
        data: { secret: { ...secret, encryptedValue: '***REDACTED***' } },
      });
    } catch (error: unknown) {
      const statusCode = getErrorMessage(error).includes('TIER_LIMIT_EXCEEDED') ? 402 : 400;
      res.status(statusCode).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
      });
    }
  });

  /**
   * GET /api/v1/teams/:teamId/secrets
   * Get team secrets
   */
  app.get('/api/v1/teams/:teamId/secrets', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { environment, decrypt } = req.query;

      const secrets = await secretsService.getTeamSecrets(
        req.params.teamId,
        environment as string,
        decrypt === 'true'
      );

      // Mask encrypted values unless decryption was requested
      const maskedSecrets = secrets.map((secret) => ({
        ...secret,
        encryptedValue: decrypt === 'true' ? secret.encryptedValue : '***REDACTED***',
      }));

      res.json({
        success: true,
        data: { secrets: maskedSecrets },
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
      });
    }
  });

  /**
   * POST /api/v1/teams/:teamId/secrets/:secretId/retrieve
   * Get secret by ID (POST method to prevent sensitive flags in GET logs)
   * Request body: { decrypt: boolean }
   */
  app.post(
    '/api/v1/teams/:teamId/secrets/:secretId/retrieve',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Use POST body for decrypt flag to prevent exposure in logs/URLs
        const decrypt = req.body?.decrypt === true;

        const secret = await secretsService.getSecretById(
          req.params.secretId,
          decrypt
        );

        if (!secret) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Secret not found' },
          });
        }

        res.json({
          success: true,
          data: {
            secret: {
              ...secret,
              encryptedValue: decrypt ? secret.encryptedValue : '***REDACTED***',
            },
          },
        });
      } catch (error: unknown) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  /**
   * PUT /api/v1/teams/:teamId/secrets/:secretId
   * Update secret
   */
  app.put(
    '/api/v1/teams/:teamId/secrets/:secretId',
    writeLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { value, description, tags, rotationIntervalDays } = req.body;

        const secret = await secretsService.updateSecret(req.params.secretId, {
          value,
          description,
          tags,
          rotationIntervalDays,
          updatedBy: getAuthenticatedUser(req).id,
        });

        res.json({
          success: true,
          data: { secret: { ...secret, encryptedValue: '***REDACTED***' } },
        });
      } catch (error: unknown) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  /**
   * DELETE /api/v1/teams/:teamId/secrets/:secretId
   * Delete secret
   */
  app.delete(
    '/api/v1/teams/:teamId/secrets/:secretId',
    writeLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        await secretsService.deleteSecret(req.params.secretId, getAuthenticatedUser(req).id);

        res.json({
          success: true,
          data: { message: 'Secret deleted successfully' },
        });
      } catch (error: unknown) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  /**
   * GET /api/v1/teams/:teamId/secrets/export/env
   * Export secrets to .env format
   */
  app.get(
    '/api/v1/teams/:teamId/secrets/export/env',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { environment } = req.query;

        if (!environment) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Environment parameter required' },
          });
        }

        const envContent = await secretsService.exportToEnv(
          req.params.teamId,
          environment as string
        );

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${environment}.env"`
        );
        res.send(envContent);
      } catch (error: unknown) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  /**
   * POST /api/v1/teams/:teamId/secrets/import/env
   * Import secrets from .env format
   */
  app.post(
    '/api/v1/teams/:teamId/secrets/import/env',
    writeLimiter,
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { environment, content } = req.body;

        if (!environment || !content) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Environment and content required' },
          });
        }

        const result = await secretsService.importFromEnv(
          req.params.teamId,
          environment,
          content,
          getAuthenticatedUser(req).id
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  // ============================================================================
  // AUDIT LOG ROUTES
  // ============================================================================

  /**
   * GET /api/v1/organizations/:organizationId/audit-logs
   * Get organization audit logs
   */
  app.get(
    '/api/v1/organizations/:organizationId/audit-logs',
    authenticateUser,
    requireOrganizationMembership,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Check permission
        const canView = await organizationService.hasPermission(
          req.params.organizationId,
          getAuthenticatedUser(req).id,
          'canViewAuditLogs'
        );

        if (!canView) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'No permission to view audit logs' },
          });
        }

        const { limit = 50, offset = 0, action, userId, teamId, startDate, endDate } = req.query;

        const result = await auditLogger.getOrganizationLogs(req.params.organizationId, {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          action: action as any,
          userId: userId as string,
          teamId: teamId as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
        });

        res.json({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  // ============================================================================
  // BILLING ROUTES
  // ============================================================================

  /**
   * POST /api/v1/organizations/:organizationId/billing/checkout
   * Create Stripe checkout session
   */
  app.post(
    '/api/v1/organizations/:organizationId/billing/checkout',
    writeLimiter,
    authenticateUser,
    requireOrganizationMembership,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Check permission
        const canManage = await organizationService.hasPermission(
          req.params.organizationId,
          getAuthenticatedUser(req).id,
          'canManageBilling'
        );

        if (!canManage) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'No permission to manage billing' },
          });
        }

        const { tier, billingPeriod, successUrl, cancelUrl } = req.body;

        const org = await organizationService.getOrganizationById(req.params.organizationId);
        if (!org) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Organization not found' },
          });
        }

        const checkout = await billingService.createCheckoutSession({
          organizationId: req.params.organizationId,
          tier,
          billingPeriod: billingPeriod || 'monthly',
          successUrl,
          cancelUrl,
          customerId: org.stripeCustomerId || undefined,
        });

        res.json({
          success: true,
          data: checkout,
        });
      } catch (error: unknown) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) },
        });
      }
    }
  );

  /**
   * POST /api/v1/billing/webhooks
   * Handle Stripe webhooks
   */
  app.post('/api/v1/billing/webhooks', async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = JSON.stringify(req.body);

      await billingService.handleWebhook(payload, signature);

      res.json({ received: true });
    } catch (error: unknown) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: getErrorMessage(error) });
    }
  });

  console.log('✅ SaaS API routes registered');
}
