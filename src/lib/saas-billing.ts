/**
 * LSH SaaS Billing Service
 * Stripe integration for subscriptions and billing
 */

import type {
  Subscription,
  Invoice,
  SubscriptionTier,
} from './saas-types.js';
import { getSupabaseClient } from './supabase-client.js';
import { auditLogger } from './saas-audit.js';
import { ENV_VARS } from '../constants/index.js';

/**
 * Stripe Pricing IDs (set via environment variables)
 */
export const STRIPE_PRICE_IDS = {
  pro_monthly: process.env[ENV_VARS.STRIPE_PRICE_PRO_MONTHLY] || '',
  pro_yearly: process.env[ENV_VARS.STRIPE_PRICE_PRO_YEARLY] || '',
  enterprise_monthly: process.env[ENV_VARS.STRIPE_PRICE_ENTERPRISE_MONTHLY] || '',
  enterprise_yearly: process.env[ENV_VARS.STRIPE_PRICE_ENTERPRISE_YEARLY] || '',
};

/**
 * Billing Service
 */
export class BillingService {
  private supabase = getSupabaseClient();
  private stripeSecretKey = process.env[ENV_VARS.STRIPE_SECRET_KEY] || '';
  private stripeWebhookSecret = process.env[ENV_VARS.STRIPE_WEBHOOK_SECRET] || '';
  private stripeApiUrl = 'https://api.stripe.com/v1';

  /**
   * Create Stripe customer
   */
  // TODO(@gwicho38): Review - createStripeCustomer
  async createStripeCustomer(params: {
    email: string;
    name?: string;
    organizationId: string;
  }): Promise<string> {
    if (!this.stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const formData = new URLSearchParams();
    formData.append('email', params.email);
    if (params.name) {
      formData.append('name', params.name);
    }
    formData.append('metadata[organization_id]', params.organizationId);

    const response = await fetch(`${this.stripeApiUrl}/customers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Stripe customer: ${error}`);
    }

    const customer = await response.json();

    // Update organization with Stripe customer ID
    await this.supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', params.organizationId);

    return customer.id;
  }

  /**
   * Create checkout session
   */
  // TODO(@gwicho38): Review - createCheckoutSession
  async createCheckoutSession(params: {
    organizationId: string;
    tier: 'pro' | 'enterprise';
    billingPeriod: 'monthly' | 'yearly';
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
  }): Promise<{ sessionId: string; url: string }> {
    if (!this.stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Get price ID
    const priceKey = `${params.tier}_${params.billingPeriod}` as keyof typeof STRIPE_PRICE_IDS;
    const priceId = STRIPE_PRICE_IDS[priceKey];

    if (!priceId) {
      throw new Error(`No Stripe price configured for ${params.tier} ${params.billingPeriod}`);
    }

    const formData = new URLSearchParams();
    formData.append('mode', 'subscription');
    formData.append('line_items[0][price]', priceId);
    formData.append('line_items[0][quantity]', '1');
    formData.append('success_url', params.successUrl);
    formData.append('cancel_url', params.cancelUrl);
    formData.append('metadata[organization_id]', params.organizationId);
    formData.append('subscription_data[metadata][organization_id]', params.organizationId);

    if (params.customerId) {
      formData.append('customer', params.customerId);
    }

    const response = await fetch(`${this.stripeApiUrl}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create checkout session: ${error}`);
    }

    const session = await response.json();

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create billing portal session
   */
  // TODO(@gwicho38): Review - createPortalSession
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    if (!this.stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const formData = new URLSearchParams();
    formData.append('customer', customerId);
    formData.append('return_url', returnUrl);

    const response = await fetch(`${this.stripeApiUrl}/billing_portal/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create portal session: ${error}`);
    }

    const session = await response.json();
    return session.url;
  }

  /**
   * Handle Stripe webhook
   */
  // TODO(@gwicho38): Review - handleWebhook
  async handleWebhook(payload: string, signature: string): Promise<void> {
    if (!this.stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    // Verify webhook signature
    const event = this.verifyWebhookSignature(payload, signature);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Verify Stripe webhook signature and parse event payload.
   *
   * In production, this should use Stripe's signature verification:
   * ```typescript
   * const event = stripe.webhooks.constructEvent(
   *   payload, signature, this.stripeWebhookSecret
   * );
   * ```
   *
   * Current implementation parses JSON without verification (TODO: implement proper verification).
   *
   * @param payload - Raw webhook body as string
   * @param _signature - Stripe-Signature header value (not yet used)
   * @returns Parsed Stripe event object
   * @throws Error if payload is not valid JSON
   * @see https://stripe.com/docs/webhooks/signatures
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe event structure
  // TODO(@gwicho38): Review - verifyWebhookSignature
  private verifyWebhookSignature(payload: string, _signature: string): any {
    // In production, use Stripe's webhook signature verification
    // For now, just parse the payload
    try {
      return JSON.parse(payload);
    } catch (_error) {
      throw new Error('Invalid webhook payload');
    }
  }

  /**
   * Handle Stripe checkout.session.completed webhook event.
   *
   * Called when a customer completes checkout. The actual subscription
   * creation is handled by the customer.subscription.created event.
   *
   * Extracts organization_id from session.metadata to link the checkout
   * to the correct organization.
   *
   * @param session - Stripe checkout session object
   * @see StripeCheckoutSession in database-types.ts for partial type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe checkout session object
  // TODO(@gwicho38): Review - handleCheckoutCompleted
  private async handleCheckoutCompleted(session: any): Promise<void> {
    const organizationId = session.metadata?.organization_id;
    if (!organizationId) {
      console.error('No organization_id in checkout session metadata');
      return;
    }

    // Subscription will be created via customer.subscription.created event
    console.log(`Checkout completed for organization ${organizationId}`);
  }

  /**
   * Handle Stripe customer.subscription.created/updated webhook events.
   *
   * Creates or updates subscription record in database and syncs tier
   * to the organization. Key operations:
   * 1. Extracts organization_id from subscription.metadata
   * 2. Determines tier from price ID (maps Stripe price → 'free' | 'pro' | 'enterprise')
   * 3. Upserts subscription record with all billing details
   * 4. Updates organization's subscription_tier and subscription_status
   * 5. Logs audit event
   *
   * Timestamps from Stripe are Unix timestamps (seconds), converted to ISO strings.
   *
   * @param subscription - Stripe subscription object
   * @see StripeSubscriptionEvent in database-types.ts for partial type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe subscription object
  // TODO(@gwicho38): Review - handleSubscriptionUpdated
  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const organizationId = subscription.metadata?.organization_id;
    if (!organizationId) {
      console.error('No organization_id in subscription metadata');
      return;
    }

    // Determine tier from price ID
    const priceId = subscription.items?.data[0]?.price?.id;
    const tier = this.getTierFromPriceId(priceId);

    // Upsert subscription
    const { error } = await this.supabase
      .from('subscriptions')
      .upsert(
        {
          organization_id: organizationId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          stripe_product_id: subscription.items?.data[0]?.price?.product,
          tier,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          trial_start: subscription.trial_start
            ? new Date(subscription.trial_start * 1000).toISOString()
            : null,
          trial_end: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        },
        { onConflict: 'stripe_subscription_id' }
      );

    if (error) {
      console.error('Failed to upsert subscription:', error);
      return;
    }

    // Update organization tier
    await this.supabase
      .from('organizations')
      .update({
        subscription_tier: tier,
        subscription_status: subscription.status,
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', organizationId);

    await auditLogger.log({
      organizationId,
      action: 'billing.subscription_updated',
      resourceType: 'subscription',
      resourceId: subscription.id,
      newValue: { tier, status: subscription.status },
    });
  }

  /**
   * Handle Stripe customer.subscription.deleted webhook event.
   *
   * Called when a subscription is canceled (immediate or at period end).
   * Operations:
   * 1. Marks subscription as 'canceled' with canceled_at timestamp
   * 2. Downgrades organization to 'free' tier
   * 3. Updates organization subscription_status to 'canceled'
   * 4. Logs audit event
   *
   * @param subscription - Stripe subscription object
   * @see StripeSubscriptionEvent in database-types.ts for partial type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe subscription object
  // TODO(@gwicho38): Review - handleSubscriptionDeleted
  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const organizationId = subscription.metadata?.organization_id;
    if (!organizationId) {
      console.error('No organization_id in subscription metadata');
      return;
    }

    // Mark subscription as canceled
    await this.supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    // Downgrade organization to free tier
    await this.supabase
      .from('organizations')
      .update({
        subscription_tier: 'free',
        subscription_status: 'canceled',
      })
      .eq('id', organizationId);

    await auditLogger.log({
      organizationId,
      action: 'billing.subscription_canceled',
      resourceType: 'subscription',
      resourceId: subscription.id,
    });
  }

  /**
   * Handle Stripe invoice.paid webhook event.
   *
   * Records successful payment in the invoices table. Extracts organization_id
   * from invoice.subscription_metadata (set during checkout).
   *
   * Amounts are in cents (e.g., 1000 = $10.00). Currency is uppercased.
   *
   * @param invoice - Stripe invoice object
   * @see StripeInvoiceEvent in database-types.ts for partial type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe invoice object
  // TODO(@gwicho38): Review - handleInvoicePaid
  private async handleInvoicePaid(invoice: any): Promise<void> {
    const organizationId = invoice.subscription_metadata?.organization_id;
    if (!organizationId) {
      return;
    }

    // Record invoice
    await this.supabase.from('invoices').upsert(
      {
        organization_id: organizationId,
        stripe_invoice_id: invoice.id,
        number: invoice.number,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency?.toUpperCase() || 'USD',
        status: 'paid',
        invoice_date: new Date(invoice.created * 1000).toISOString(),
        paid_at: new Date(invoice.status_transitions?.paid_at * 1000).toISOString(),
        invoice_pdf_url: invoice.invoice_pdf,
      },
      { onConflict: 'stripe_invoice_id' }
    );
  }

  /**
   * Handle Stripe invoice.payment_failed webhook event.
   *
   * Called when payment fails (declined card, insufficient funds, etc.).
   * Updates organization subscription_status to 'past_due' and logs audit event.
   *
   * Note: Does not immediately downgrade tier. Stripe will retry payment
   * according to your dunning settings. Downgrade happens on subscription.deleted.
   *
   * @param invoice - Stripe invoice object
   * @see StripeInvoiceEvent in database-types.ts for partial type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe invoice object
  // TODO(@gwicho38): Review - handleInvoicePaymentFailed
  private async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    const organizationId = invoice.subscription_metadata?.organization_id;
    if (!organizationId) {
      return;
    }

    // Update organization status
    await this.supabase
      .from('organizations')
      .update({
        subscription_status: 'past_due',
      })
      .eq('id', organizationId);

    await auditLogger.log({
      organizationId,
      action: 'billing.payment_failed',
      resourceType: 'subscription',
      metadata: { invoice_id: invoice.id },
    });
  }

  /**
   * Get tier from Stripe price ID
   */
  // TODO(@gwicho38): Review - getTierFromPriceId
  private getTierFromPriceId(priceId: string): SubscriptionTier {
    if (
      priceId === STRIPE_PRICE_IDS.pro_monthly ||
      priceId === STRIPE_PRICE_IDS.pro_yearly
    ) {
      return 'pro';
    }
    if (
      priceId === STRIPE_PRICE_IDS.enterprise_monthly ||
      priceId === STRIPE_PRICE_IDS.enterprise_yearly
    ) {
      return 'enterprise';
    }
    return 'free';
  }

  /**
   * Get subscription for organization
   */
  // TODO(@gwicho38): Review - getOrganizationSubscription
  async getOrganizationSubscription(organizationId: string): Promise<Subscription | null> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbSubscriptionToSubscription(data);
  }

  /**
   * Get invoices for organization
   */
  // TODO(@gwicho38): Review - getOrganizationInvoices
  async getOrganizationInvoices(organizationId: string): Promise<Invoice[]> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('invoice_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to get invoices: ${error.message}`);
    }

    return (data || []).map(this.mapDbInvoiceToInvoice);
  }

  /**
   * Transform Supabase subscription record to domain model.
   *
   * Maps database snake_case columns to TypeScript camelCase properties:
   * - `organization_id` → `organizationId`
   * - `stripe_subscription_id` → `stripeSubscriptionId` (Stripe sub_xxx ID)
   * - `stripe_price_id` → `stripePriceId` (Stripe price_xxx ID)
   * - `stripe_product_id` → `stripeProductId` (Stripe prod_xxx ID)
   * - `tier` → `tier` (SubscriptionTier: 'free' | 'pro' | 'enterprise')
   * - `status` → `status` (SubscriptionStatus)
   * - `current_period_start` → `currentPeriodStart` (nullable Date)
   * - `current_period_end` → `currentPeriodEnd` (nullable Date)
   * - `cancel_at_period_end` → `cancelAtPeriodEnd` (boolean)
   * - `trial_start` → `trialStart` (nullable Date)
   * - `trial_end` → `trialEnd` (nullable Date)
   * - `canceled_at` → `canceledAt` (nullable Date)
   *
   * @param dbSub - Supabase record from 'subscriptions' table
   * @returns Domain Subscription object
   * @see DbSubscriptionRecord in database-types.ts for input shape
   * @see Subscription in saas-types.ts for output shape
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbSubscriptionToSubscription
  private mapDbSubscriptionToSubscription(dbSub: any): Subscription {
    return {
      id: dbSub.id,
      organizationId: dbSub.organization_id,
      stripeSubscriptionId: dbSub.stripe_subscription_id,
      stripePriceId: dbSub.stripe_price_id,
      stripeProductId: dbSub.stripe_product_id,
      tier: dbSub.tier,
      status: dbSub.status,
      currentPeriodStart: dbSub.current_period_start
        ? new Date(dbSub.current_period_start)
        : null,
      currentPeriodEnd: dbSub.current_period_end ? new Date(dbSub.current_period_end) : null,
      cancelAtPeriodEnd: dbSub.cancel_at_period_end,
      trialStart: dbSub.trial_start ? new Date(dbSub.trial_start) : null,
      trialEnd: dbSub.trial_end ? new Date(dbSub.trial_end) : null,
      createdAt: new Date(dbSub.created_at),
      updatedAt: new Date(dbSub.updated_at),
      canceledAt: dbSub.canceled_at ? new Date(dbSub.canceled_at) : null,
    };
  }

  /**
   * Transform Supabase invoice record to domain model.
   *
   * Maps database snake_case columns to TypeScript camelCase properties:
   * - `organization_id` → `organizationId`
   * - `stripe_invoice_id` → `stripeInvoiceId` (Stripe in_xxx ID)
   * - `amount_due` → `amountDue` (in cents, e.g., 1000 = $10.00)
   * - `amount_paid` → `amountPaid` (in cents)
   * - `invoice_date` → `invoiceDate` (Date)
   * - `due_date` → `dueDate` (nullable Date)
   * - `paid_at` → `paidAt` (nullable Date)
   * - `invoice_pdf_url` → `invoicePdfUrl` (Stripe-hosted PDF URL)
   *
   * @param dbInvoice - Supabase record from 'invoices' table
   * @returns Domain Invoice object
   * @see DbInvoiceRecord in database-types.ts for input shape
   * @see Invoice in saas-types.ts for output shape
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbInvoiceToInvoice
  private mapDbInvoiceToInvoice(dbInvoice: any): Invoice {
    return {
      id: dbInvoice.id,
      organizationId: dbInvoice.organization_id,
      stripeInvoiceId: dbInvoice.stripe_invoice_id,
      number: dbInvoice.number,
      amountDue: dbInvoice.amount_due,
      amountPaid: dbInvoice.amount_paid,
      currency: dbInvoice.currency,
      status: dbInvoice.status,
      invoiceDate: new Date(dbInvoice.invoice_date),
      dueDate: dbInvoice.due_date ? new Date(dbInvoice.due_date) : null,
      paidAt: dbInvoice.paid_at ? new Date(dbInvoice.paid_at) : null,
      invoicePdfUrl: dbInvoice.invoice_pdf_url,
      createdAt: new Date(dbInvoice.created_at),
      updatedAt: new Date(dbInvoice.updated_at),
    };
  }
}

/**
 * Singleton instance
 */
export const billingService = new BillingService();
