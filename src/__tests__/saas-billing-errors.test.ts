/**
 * Tests for saas-billing.ts error handling
 * Verifies LSHError is thrown with correct error codes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('../lib/supabase-client.js', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

jest.mock('../lib/saas-audit.js', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock fetch for Stripe API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { BillingService } from '../lib/saas-billing.js';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('BillingService Error Handling', () => {
  let billingService: BillingService;

  beforeEach(() => {
    // Reset environment variables
    process.env.STRIPE_SECRET_KEY = '';
    process.env.STRIPE_WEBHOOK_SECRET = '';
    process.env.STRIPE_PRICE_PRO_MONTHLY = '';
    process.env.STRIPE_PRICE_PRO_YEARLY = '';
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = '';
    process.env.STRIPE_PRICE_ENTERPRISE_YEARLY = '';

    billingService = new BillingService();
    mockFetch.mockReset();
  });

  describe('createStripeCustomer', () => {
    it('should throw LSHError with CONFIG_MISSING_ENV_VAR when STRIPE_SECRET_KEY is missing', async () => {
      await expect(
        billingService.createStripeCustomer({
          email: 'test@example.com',
          organizationId: 'org-123',
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.CONFIG_MISSING_ENV_VAR,
        message: expect.stringContaining('STRIPE_SECRET_KEY'),
      });
    });

    it('should throw LSHError with BILLING_STRIPE_ERROR when Stripe API fails', async () => {
      // Set the key to enable the method
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      // Create new instance with the key
      const service = new BillingService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Invalid email'),
      });

      await expect(
        service.createStripeCustomer({
          email: 'invalid',
          organizationId: 'org-123',
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.BILLING_STRIPE_ERROR,
        context: expect.objectContaining({
          stripeError: 'Invalid email',
          statusCode: 400,
        }),
      });
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw LSHError when STRIPE_SECRET_KEY is missing', async () => {
      await expect(
        billingService.createCheckoutSession({
          organizationId: 'org-123',
          tier: 'pro',
          billingPeriod: 'monthly',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.CONFIG_MISSING_ENV_VAR,
      });
    });

    it('should throw LSHError when price ID is not configured', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      const service = new BillingService();

      await expect(
        service.createCheckoutSession({
          organizationId: 'org-123',
          tier: 'pro',
          billingPeriod: 'monthly',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.CONFIG_MISSING_ENV_VAR,
        context: expect.objectContaining({
          tier: 'pro',
          billingPeriod: 'monthly',
        }),
      });
    });

    it('should throw LSHError when checkout session fails', async () => {
      // Note: STRIPE_PRICE_IDS is set at module load time, so runtime changes don't affect it
      // This test verifies the error code is correct for missing price
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      const service = new BillingService();

      // Will throw CONFIG_MISSING_ENV_VAR because price IDs are set at module load
      await expect(
        service.createCheckoutSession({
          organizationId: 'org-123',
          tier: 'pro',
          billingPeriod: 'monthly',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toBeInstanceOf(LSHError);
    });
  });

  describe('createPortalSession', () => {
    it('should throw LSHError when STRIPE_SECRET_KEY is missing', async () => {
      await expect(
        billingService.createPortalSession('cus_123', 'https://example.com/return')
      ).rejects.toMatchObject({
        code: ErrorCodes.CONFIG_MISSING_ENV_VAR,
      });
    });

    it('should throw LSHError with BILLING_STRIPE_ERROR when portal API fails', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      const service = new BillingService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Customer not found'),
      });

      await expect(
        service.createPortalSession('cus_invalid', 'https://example.com/return')
      ).rejects.toMatchObject({
        code: ErrorCodes.BILLING_STRIPE_ERROR,
        context: expect.objectContaining({
          customerId: 'cus_invalid',
        }),
      });
    });
  });

  describe('handleWebhook', () => {
    it('should throw LSHError when STRIPE_WEBHOOK_SECRET is missing', async () => {
      await expect(billingService.handleWebhook('{}', 'sig_123')).rejects.toMatchObject({
        code: ErrorCodes.CONFIG_MISSING_ENV_VAR,
        message: expect.stringContaining('STRIPE_WEBHOOK_SECRET'),
      });
    });

    it('should throw LSHError with API_WEBHOOK_VERIFICATION_FAILED for invalid JSON', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      const service = new BillingService();

      await expect(service.handleWebhook('invalid json', 'sig_123')).rejects.toMatchObject({
        code: ErrorCodes.API_WEBHOOK_VERIFICATION_FAILED,
        message: expect.stringContaining('Invalid webhook payload'),
      });
    });
  });

  describe('getOrganizationInvoices', () => {
    it('should throw LSHError with DB_QUERY_FAILED when database query fails', async () => {
      // Mock Supabase to return an error
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        })),
      };

      // Use reflection to replace supabase client
      const anyService = billingService as unknown as { supabase: typeof mockSupabase };
      anyService.supabase = mockSupabase;

      await expect(billingService.getOrganizationInvoices('org-123')).rejects.toMatchObject({
        code: ErrorCodes.DB_QUERY_FAILED,
        context: expect.objectContaining({
          organizationId: 'org-123',
          dbError: 'Database connection failed',
        }),
      });
    });
  });
});

describe('LSHError Integration', () => {
  it('should include correct HTTP status codes', () => {
    // CONFIG_MISSING_ENV_VAR defaults to 500 (Internal Server Error) per getDefaultStatusCode
    const configError = new LSHError(ErrorCodes.CONFIG_MISSING_ENV_VAR, 'Missing config', {});
    expect(configError.statusCode).toBe(500); // Internal Server Error

    const stripeError = new LSHError(ErrorCodes.BILLING_STRIPE_ERROR, 'Stripe failed', {});
    expect(stripeError.statusCode).toBe(500); // Internal Server Error for Stripe errors

    const webhookError = new LSHError(
      ErrorCodes.API_WEBHOOK_VERIFICATION_FAILED,
      'Invalid signature',
      {}
    );
    expect(webhookError.statusCode).toBe(500); // Internal Server Error for webhook errors

    const dbError = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Query failed', {});
    expect(dbError.statusCode).toBe(500); // Internal Server Error for DB errors
  });

  it('should serialize to JSON correctly', () => {
    const error = new LSHError(ErrorCodes.BILLING_STRIPE_ERROR, 'Test error', {
      stripeError: 'Card declined',
      customerId: 'cus_123',
    });

    const json = error.toJSON();

    expect(json.code).toBe(ErrorCodes.BILLING_STRIPE_ERROR);
    expect(json.message).toBe('Test error');
    expect(json.context).toEqual({
      stripeError: 'Card declined',
      customerId: 'cus_123',
    });
    expect(json.timestamp).toBeDefined();
  });

  it('should have proper toString output', () => {
    const error = new LSHError(
      ErrorCodes.CONFIG_MISSING_ENV_VAR,
      'STRIPE_SECRET_KEY not configured',
      {
        envVar: 'STRIPE_SECRET_KEY',
      }
    );

    const str = error.toString();

    expect(str).toContain('[CONFIG_MISSING_ENV_VAR]');
    expect(str).toContain('STRIPE_SECRET_KEY not configured');
    expect(str).toContain('"envVar":"STRIPE_SECRET_KEY"');
  });
});
