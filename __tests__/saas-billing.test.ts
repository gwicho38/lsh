/**
 * SaaS Billing Service Tests
 * Tests for the BillingService class
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Create stable mock references - these persist across tests
const mockSingleFn = jest.fn();
const mockOrderFn = jest.fn();
const mockUpsertFn = jest.fn();
const mockUpdateFn = jest.fn();
const mockFromFn = jest.fn();

// Create stable mock chain
const mockSupabase: any = {
  from: mockFromFn,
  insert: jest.fn(),
  update: mockUpdateFn,
  upsert: mockUpsertFn,
  select: jest.fn(),
  eq: jest.fn(),
  order: mockOrderFn,
  limit: jest.fn(),
  single: mockSingleFn,
};

// Setup chaining - always returns the chain
mockSupabase.from.mockReturnValue(mockSupabase);
mockSupabase.insert.mockReturnValue(mockSupabase);
mockSupabase.update.mockReturnValue(mockSupabase);
mockSupabase.upsert.mockReturnValue(mockSupabase);
mockSupabase.select.mockReturnValue(mockSupabase);
mockSupabase.eq.mockReturnValue(mockSupabase);
mockSupabase.order.mockReturnValue(mockSupabase);
mockSupabase.limit.mockReturnValue(mockSupabase);
mockSupabase.single.mockReturnValue(mockSupabase);

// Make chain thenable with default empty response
const makeThenable = (defaultValue: any) => {
  Object.defineProperty(mockSupabase, 'then', {
    value: (resolve: any) => Promise.resolve(defaultValue).then(resolve),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(mockSupabase, 'catch', {
    value: () => Promise.resolve(defaultValue),
    writable: true,
    configurable: true,
  });
};

makeThenable({ data: [], error: null });

jest.mock('../src/lib/supabase-client.js', () => ({
  getSupabaseClient: () => mockSupabase,
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
    // Clear all mock call counts but keep the chaining setup
    jest.clearAllMocks();
    mockFetch.mockReset();

    // Re-setup chaining after clearAllMocks
    mockFromFn.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockUpdateFn.mockReturnValue(mockSupabase);
    mockUpsertFn.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockOrderFn.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockReturnValue(mockSupabase);
    mockSingleFn.mockReturnValue(mockSupabase);

    // Reset thenable to default
    makeThenable({ data: [], error: null });

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
      // Make upsert resolve successfully
      mockUpsertFn.mockResolvedValueOnce({ error: null });

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

      expect(mockFromFn).toHaveBeenCalledWith('subscriptions');
      expect(mockUpsertFn).toHaveBeenCalled();
    });

    it('should handle customer.subscription.deleted event', async () => {
      // The chain should return mockSupabase, and the terminal eq should resolve
      mockSupabase.eq.mockResolvedValueOnce({ error: null });
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

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
      expect(mockUpdateFn).toHaveBeenCalled();
    });

    it('should handle invoice.paid event', async () => {
      mockUpsertFn.mockResolvedValueOnce({ error: null });

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
            status: 'paid',
            status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
            invoice_pdf: 'https://stripe.com/invoice.pdf',
          },
        },
      };

      await billingService.handleWebhook(JSON.stringify(event), 'sig_test');

      expect(mockFromFn).toHaveBeenCalledWith('invoices');
    });

    it('should handle invoice.payment_failed event', async () => {
      // The chain should return mockSupabase, and the terminal eq should resolve
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

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
      expect(mockUpdateFn).toHaveBeenCalled();
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
