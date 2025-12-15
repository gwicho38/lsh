/**
 * LSH SaaS Billing Service
 * Stripe integration for subscriptions and billing
 */
import type { Subscription, Invoice } from './saas-types.js';
/**
 * Stripe Pricing IDs (set via environment variables)
 */
export declare const STRIPE_PRICE_IDS: {
    pro_monthly: string;
    pro_yearly: string;
    enterprise_monthly: string;
    enterprise_yearly: string;
};
/**
 * Billing Service
 */
export declare class BillingService {
    private supabase;
    private stripeSecretKey;
    private stripeWebhookSecret;
    private stripeApiUrl;
    /**
     * Create Stripe customer
     */
    createStripeCustomer(params: {
        email: string;
        name?: string;
        organizationId: string;
    }): Promise<string>;
    /**
     * Create checkout session
     */
    createCheckoutSession(params: {
        organizationId: string;
        tier: 'pro' | 'enterprise';
        billingPeriod: 'monthly' | 'yearly';
        successUrl: string;
        cancelUrl: string;
        customerId?: string;
    }): Promise<{
        sessionId: string;
        url: string;
    }>;
    /**
     * Create billing portal session
     */
    createPortalSession(customerId: string, returnUrl: string): Promise<string>;
    /**
     * Handle Stripe webhook
     */
    handleWebhook(payload: string, signature: string): Promise<void>;
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
    private verifyWebhookSignature;
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
    private handleCheckoutCompleted;
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
    private handleSubscriptionUpdated;
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
    private handleSubscriptionDeleted;
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
    private handleInvoicePaid;
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
    private handleInvoicePaymentFailed;
    /**
     * Get tier from Stripe price ID
     */
    private getTierFromPriceId;
    /**
     * Get subscription for organization
     */
    getOrganizationSubscription(organizationId: string): Promise<Subscription | null>;
    /**
     * Get invoices for organization
     */
    getOrganizationInvoices(organizationId: string): Promise<Invoice[]>;
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
    private mapDbSubscriptionToSubscription;
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
    private mapDbInvoiceToInvoice;
}
/**
 * Singleton instance
 */
export declare const billingService: BillingService;
