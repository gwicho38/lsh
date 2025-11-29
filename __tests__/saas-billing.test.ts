/**
 * SaaS Billing Service Tests
 * Tests for the BillingService class
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Create mock with proper chaining
let mockSingleFn: jest.Mock;
let mockOrderFn: jest.Mock;
let mockLimitFn: jest.Mock;

const createMockSupabase = () => {
  mockSingleFn = jest.fn();
  mockOrderFn = jest.fn();
  mockLimitFn = jest.fn();

  const mockChain = {
    from: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    order: mockOrderFn,
    limit: mockLimitFn,
    single: mockSingleFn,
  };

  // Each method returns the chain for fluent API
  mockChain.from.mockReturnValue(mockChain);
  mockChain.insert.mockReturnValue(mockChain);
  mockChain.update.mockReturnValue(mockChain);
  mockChain.upsert.mockReturnValue(mockChain);
  mockChain.select.mockReturnValue(mockChain);
  mockChain.eq.mockReturnValue(mockChain);
  mockChain.order.mockReturnValue(mockChain);
  mockChain.limit.mockReturnValue(mockChain);

  return mockChain;
};

let mockSupabase = createMockSupabase();

jest.mock('../src/lib/supabase-client.js', () => ({
  get getSupabaseClient() {
    return () => mockSupabase;
  },
}));

// Mock audit logger
jest.mock('../src/lib/saas-audit.js', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

// Store original env
const originalEnv = { ...process.env };

describe('SaaS Billing Service', () => {
  let BillingService: typeof import('../src/lib/saas-billing.js').BillingService;
  let billingService: InstanceType<typeof BillingService>;
  let STRIPE_PRICE_IDS: typeof import('../src/lib/saas-billing.js').STRIPE_PRICE_IDS;

  beforeAll(async () => {
    // Reset modules to ensure our mock is applied fresh
    jest.resetModules();

    // Re-establish the mock after reset
    jest.doMock('../src/lib/supabase-client.js', () => ({
      getSupabaseClient: () => mockSupabase,
    }));

    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_secret';
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly';
    process.env.STRIPE_PRICE_PRO_YEARLY = 'price_pro_yearly';
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = 'price_enterprise_monthly';
    process.env.STRIPE_PRICE_ENTERPRISE_YEARLY = 'price_enterprise_yearly';

    const module = await import('../src/lib/saas-billing.js');
    BillingService = module.BillingService;
    STRIPE_PRICE_IDS = module.STRIPE_PRICE_IDS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    mockFetch.mockReset();
    billingService = new BillingService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Create Stripe Customer', () => {
    it('should create a Stripe customer successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cus_test123' }),
      });

      const customerId = await billingService.createStripeCustomer({
        email: 'test@example.com',
        name: 'Test Organization',
        organizationId: 'org-123',
      });

      expect(customerId).toBe('cus_test123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/customers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk_test_fake_key',
          }),
        })
      );
    });

    it('should throw error if Stripe returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid API key',
      });

      await expect(
        billingService.createStripeCustomer({
          email: 'test@example.com',
          organizationId: 'org-123',
        })
      ).rejects.toThrow('Failed to create Stripe customer');
    });

    it('should throw error if STRIPE_SECRET_KEY not set', async () => {
      const savedKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      // Need fresh instance
      const freshService = new BillingService();

      await expect(
        freshService.createStripeCustomer({
          email: 'test@example.com',
          organizationId: 'org-123',
        })
      ).rejects.toThrow('STRIPE_SECRET_KEY not configured');

      process.env.STRIPE_SECRET_KEY = savedKey;
    });
  });

  describe('Create Checkout Session', () => {
    it('should create checkout session for pro monthly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/test',
        }),
      });

      const result = await billingService.createCheckoutSession({
        organizationId: 'org-123',
        tier: 'pro',
        billingPeriod: 'monthly',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });

      expect(result.sessionId).toBe('cs_test123');
      expect(result.url).toBe('https://checkout.stripe.com/test');
    });

    it('should include customer ID if provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'cs_test456',
          url: 'https://checkout.stripe.com/test2',
        }),
      });

      await billingService.createCheckoutSession({
        organizationId: 'org-123',
        tier: 'enterprise',
        billingPeriod: 'yearly',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        customerId: 'cus_existing',
      });

      // Verify customer was included in request
      const call = mockFetch.mock.calls[0];
      const body = call[1].body;
      expect(body.get('customer')).toBe('cus_existing');
    });

    it('should throw error for unconfigured price', async () => {
      // Need to test with missing price ID
      const savedPrice = process.env.STRIPE_PRICE_PRO_MONTHLY;
      delete process.env.STRIPE_PRICE_PRO_MONTHLY;

      // Reload module to get fresh STRIPE_PRICE_IDS
      jest.resetModules();
      const freshModule = await import('../src/lib/saas-billing.js');
      const freshService = new freshModule.BillingService();

      await expect(
        freshService.createCheckoutSession({
          organizationId: 'org-123',
          tier: 'pro',
          billingPeriod: 'monthly',
          successUrl: 'https://app.example.com/success',
          cancelUrl: 'https://app.example.com/cancel',
        })
      ).rejects.toThrow('No Stripe price configured');

      process.env.STRIPE_PRICE_PRO_MONTHLY = savedPrice;
    });
  });

  describe('Create Portal Session', () => {
    it('should create billing portal session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: 'https://billing.stripe.com/session/test',
        }),
      });

      const url = await billingService.createPortalSession(
        'cus_test123',
        'https://app.example.com/dashboard'
      );

      expect(url).toBe('https://billing.stripe.com/session/test');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/billing_portal/sessions',
        expect.anything()
      );
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Customer not found',
      });

      await expect(
        billingService.createPortalSession('cus_invalid', 'https://app.example.com')
      ).rejects.toThrow('Failed to create portal session');
    });
  });

  describe('Webhook Handling', () => {
    it('should handle checkout.session.completed event', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { organization_id: 'org-123' },
          },
        },
      };

      await billingService.handleWebhook(JSON.stringify(event), 'sig_test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Checkout completed for organization org-123')
      );

      consoleSpy.mockRestore();
    });

    it('should handle customer.subscription.created event', async () => {
      // Mock upsert
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });

      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            metadata: { organization_id: 'org-123' },
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
            items: {
              data: [
                {
                  price: {
                    id: 'price_pro_monthly',
                    product: 'prod_pro',
                  },
                },
              ],
            },
          },
        },
      };

      await billingService.handleWebhook(JSON.stringify(event), 'sig_test');

      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('should handle customer.subscription.deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test123',
            metadata: { organization_id: 'org-123' },
          },
        },
      };

      await billingService.handleWebhook(JSON.stringify(event), 'sig_test');

      // Should update subscription and organization
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should handle invoice.paid event', async () => {
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });

      const event = {
        type: 'invoice.paid',
        data: {
          object: {
            id: 'inv_test123',
            subscription_metadata: { organization_id: 'org-123' },
            number: 'INV-001',
            amount_due: 1999,
            amount_paid: 1999,
            currency: 'usd',
            created: Math.floor(Date.now() / 1000),
            status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
            invoice_pdf: 'https://stripe.com/invoice.pdf',
          },
        },
      };

      await billingService.handleWebhook(JSON.stringify(event), 'sig_test');

      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
    });

    it('should handle invoice.payment_failed event', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_test123',
            subscription_metadata: { organization_id: 'org-123' },
          },
        },
      };

      await billingService.handleWebhook(JSON.stringify(event), 'sig_test');

      // Should update organization status to past_due
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should throw error for invalid webhook payload', async () => {
      await expect(billingService.handleWebhook('invalid json', 'sig_test')).rejects.toThrow(
        'Invalid webhook payload'
      );
    });

    it('should throw error if webhook secret not configured', async () => {
      const savedSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const freshService = new BillingService();

      await expect(freshService.handleWebhook('{}', 'sig_test')).rejects.toThrow(
        'STRIPE_WEBHOOK_SECRET not configured'
      );

      process.env.STRIPE_WEBHOOK_SECRET = savedSecret;
    });
  });

  describe('Get Organization Subscription', () => {
    it('should return subscription for organization', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'sub-db-123',
          organization_id: 'org-123',
          stripe_subscription_id: 'sub_stripe123',
          stripe_price_id: 'price_pro_monthly',
          stripe_product_id: 'prod_pro',
          tier: 'pro',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const subscription = await billingService.getOrganizationSubscription('org-123');

      expect(subscription).toBeDefined();
      expect(subscription?.tier).toBe('pro');
      expect(subscription?.status).toBe('active');
    });

    it('should return null for organization without subscription', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const subscription = await billingService.getOrganizationSubscription('org-no-sub');

      expect(subscription).toBeNull();
    });
  });

  describe('Get Organization Invoices', () => {
    it('should return invoices for organization', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [
          {
            id: 'inv-db-1',
            organization_id: 'org-123',
            stripe_invoice_id: 'inv_stripe1',
            number: 'INV-001',
            amount_due: 1999,
            amount_paid: 1999,
            currency: 'USD',
            status: 'paid',
            invoice_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'inv-db-2',
            organization_id: 'org-123',
            stripe_invoice_id: 'inv_stripe2',
            number: 'INV-002',
            amount_due: 1999,
            amount_paid: 1999,
            currency: 'USD',
            status: 'paid',
            invoice_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const invoices = await billingService.getOrganizationInvoices('org-123');

      expect(invoices).toHaveLength(2);
      expect(invoices[0].number).toBe('INV-001');
    });

    it('should throw error on database failure', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(billingService.getOrganizationInvoices('org-123')).rejects.toThrow(
        'Failed to get invoices'
      );
    });
  });

  describe('STRIPE_PRICE_IDS', () => {
    it('should export price IDs from environment', () => {
      expect(STRIPE_PRICE_IDS).toBeDefined();
      // Note: The actual values depend on when the module was loaded
      expect(typeof STRIPE_PRICE_IDS.pro_monthly).toBe('string');
      expect(typeof STRIPE_PRICE_IDS.pro_yearly).toBe('string');
      expect(typeof STRIPE_PRICE_IDS.enterprise_monthly).toBe('string');
      expect(typeof STRIPE_PRICE_IDS.enterprise_yearly).toBe('string');
    });
  });
});
