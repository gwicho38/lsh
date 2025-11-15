/**
 * LSH SaaS API Routes
 * RESTful API endpoints for the SaaS platform
 */

import type { Request, Response, NextFunction } from 'express';
import { authService, verifyToken } from '../lib/saas-auth.js';
import { organizationService, teamService } from '../lib/saas-organizations.js';
import { billingService } from '../lib/saas-billing.js';
import { auditLogger, getIpFromRequest, getUserAgentFromRequest } from '../lib/saas-audit.js';
import { emailService } from '../lib/saas-email.js';
import { secretsService } from '../lib/saas-secrets.js';
import type { ApiResponse } from '../lib/saas-types.js';

/**
 * Middleware: Authenticate user from JWT token
 */
export async function authenticateUser(req: any, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization token provided',
        },
      });
    }

    const token = authHeader.substring(7);
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
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Authentication failed',
      },
    });
  }
}

/**
 * Middleware: Check organization membership
 */
export async function requireOrganizationMembership(req: any, res: Response, next: NextFunction) {
  try {
    const organizationId = req.params.organizationId || req.body.organizationId;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Organization ID required' },
      });
    }

    const role = await organizationService.getUserRole(organizationId, req.user.id);
    if (!role) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization' },
      });
    }

    req.organizationRole = role;
    next();
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
}

/**
 * Setup SaaS API routes
 */
export function setupSaaSApiRoutes(app: any) {
  // ============================================================================
  // AUTH ROUTES
  // ============================================================================

  /**
   * POST /api/v1/auth/signup
   * Sign up a new user
   */
  app.post('/api/v1/auth/signup', async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Email and password required' },
        });
      }

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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: error.message.includes('ALREADY_EXISTS') ? 'EMAIL_ALREADY_EXISTS' : 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /api/v1/auth/login
   * Login with email and password
   */
  app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Email and password required' },
        });
      }

      const ipAddress = getIpFromRequest(req);
      const session = await authService.login({ email, password }, ipAddress);

      res.json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('EMAIL_NOT_VERIFIED') ? 403 : 401;
      res.status(statusCode).json({
        success: false,
        error: { code: error.message || 'INVALID_CREDENTIALS', message: error.message },
      });
    }
  });

  /**
   * POST /api/v1/auth/verify-email
   * Verify email address
   */
  app.post('/api/v1/auth/verify-email', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Token required' },
        });
      }

      const user = await authService.verifyEmail(token);

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.firstName || undefined);

      res.json({
        success: true,
        data: { user, message: 'Email verified successfully' },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: error.message },
      });
    }
  });

  /**
   * POST /api/v1/auth/resend-verification
   * Resend verification email
   */
  app.post('/api/v1/auth/resend-verification', async (req: Request, res: Response) => {
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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  app.post('/api/v1/auth/refresh', async (req: Request, res: Response) => {
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
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: error.message },
      });
    }
  });

  /**
   * GET /api/v1/auth/me
   * Get current user
   */
  app.get('/api/v1/auth/me', authenticateUser, async (req: any, res: Response) => {
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
  app.post('/api/v1/organizations', authenticateUser, async (req: any, res: Response) => {
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
        ownerId: req.user.id,
      });

      res.json({
        success: true,
        data: { organization },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
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
    async (req: any, res: Response) => {
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
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    async (req: any, res: Response) => {
      try {
        const members = await organizationService.getOrganizationMembers(
          req.params.organizationId
        );

        res.json({
          success: true,
          data: { members },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    authenticateUser,
    requireOrganizationMembership,
    async (req: any, res: Response) => {
      try {
        // Check permission
        const canInvite = await organizationService.hasPermission(
          req.params.organizationId,
          req.user.id,
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
          invitedBy: req.user.id,
        });

        res.json({
          success: true,
          data: { member },
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    authenticateUser,
    requireOrganizationMembership,
    async (req: any, res: Response) => {
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
          req.user.id
        );

        res.json({
          success: true,
          data: { team },
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    async (req: any, res: Response) => {
      try {
        const teams = await teamService.getOrganizationTeams(req.params.organizationId);

        res.json({
          success: true,
          data: { teams },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
  app.post('/api/v1/teams/:teamId/secrets', authenticateUser, async (req: any, res: Response) => {
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
        createdBy: req.user.id,
      });

      res.json({
        success: true,
        data: { secret: { ...secret, encryptedValue: '***REDACTED***' } },
      });
    } catch (error: any) {
      const statusCode = error.message.includes('TIER_LIMIT_EXCEEDED') ? 402 : 400;
      res.status(statusCode).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /api/v1/teams/:teamId/secrets
   * Get team secrets
   */
  app.get('/api/v1/teams/:teamId/secrets', authenticateUser, async (req: any, res: Response) => {
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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /api/v1/teams/:teamId/secrets/:secretId
   * Get secret by ID
   */
  app.get(
    '/api/v1/teams/:teamId/secrets/:secretId',
    authenticateUser,
    async (req: any, res: Response) => {
      try {
        const { decrypt } = req.query;

        const secret = await secretsService.getSecretById(
          req.params.secretId,
          decrypt === 'true'
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
              encryptedValue: decrypt === 'true' ? secret.encryptedValue : '***REDACTED***',
            },
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    authenticateUser,
    async (req: any, res: Response) => {
      try {
        const { value, description, tags, rotationIntervalDays } = req.body;

        const secret = await secretsService.updateSecret(req.params.secretId, {
          value,
          description,
          tags,
          rotationIntervalDays,
          updatedBy: req.user.id,
        });

        res.json({
          success: true,
          data: { secret: { ...secret, encryptedValue: '***REDACTED***' } },
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    authenticateUser,
    async (req: any, res: Response) => {
      try {
        await secretsService.deleteSecret(req.params.secretId, req.user.id);

        res.json({
          success: true,
          data: { message: 'Secret deleted successfully' },
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    async (req: any, res: Response) => {
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
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    authenticateUser,
    async (req: any, res: Response) => {
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
          req.user.id
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    async (req: any, res: Response) => {
      try {
        // Check permission
        const canView = await organizationService.hasPermission(
          req.params.organizationId,
          req.user.id,
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
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    authenticateUser,
    requireOrganizationMembership,
    async (req: any, res: Response) => {
      try {
        // Check permission
        const canManage = await organizationService.hasPermission(
          req.params.organizationId,
          req.user.id,
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
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
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
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  console.log('✅ SaaS API routes registered');
}
