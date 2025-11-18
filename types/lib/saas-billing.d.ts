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
     * Verify webhook signature
     */
    private verifyWebhookSignature;
    /**
     * Handle checkout completed
     */
    private handleCheckoutCompleted;
    /**
     * Handle subscription updated
     */
    private handleSubscriptionUpdated;
    /**
     * Handle subscription deleted
     */
    private handleSubscriptionDeleted;
    /**
     * Handle invoice paid
     */
    private handleInvoicePaid;
    /**
     * Handle invoice payment failed
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
     * Map database subscription to Subscription type
     */
    private mapDbSubscriptionToSubscription;
    /**
     * Map database invoice to Invoice type
     */
    private mapDbInvoiceToInvoice;
}
/**
 * Singleton instance
 */
export declare const billingService: BillingService;
