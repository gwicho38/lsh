/**
 * LSH SaaS Email Service
 * Email sending using Resend API
 */
/**
 * Email Service Configuration
 */
interface EmailConfig {
    apiKey: string;
    fromEmail: string;
    fromName: string;
    baseUrl: string;
}
/**
 * Email Service
 */
export declare class EmailService {
    private config;
    private resendApiUrl;
    constructor(config?: Partial<EmailConfig>);
    /**
     * Send email using Resend API
     */
    private sendEmail;
    /**
     * Send email verification
     */
    sendVerificationEmail(to: string, token: string, firstName?: string): Promise<void>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(to: string, token: string, firstName?: string): Promise<void>;
    /**
     * Send organization invitation email
     */
    sendOrganizationInvite(to: string, organizationName: string, inviterName: string, inviteUrl: string): Promise<void>;
    /**
     * Send welcome email
     */
    sendWelcomeEmail(to: string, firstName?: string): Promise<void>;
    /**
     * Send subscription confirmation
     */
    sendSubscriptionConfirmation(to: string, tier: string, firstName?: string): Promise<void>;
    /**
     * Email verification template
     */
    private getVerificationEmailTemplate;
    /**
     * Password reset template
     */
    private getPasswordResetTemplate;
    /**
     * Organization invite template
     */
    private getOrganizationInviteTemplate;
    /**
     * Welcome email template
     */
    private getWelcomeEmailTemplate;
    /**
     * Subscription confirmation template
     */
    private getSubscriptionConfirmationTemplate;
}
/**
 * Singleton instance
 */
export declare const emailService: EmailService;
export {};
