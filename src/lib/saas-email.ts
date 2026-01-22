/**
 * LSH SaaS Email Service
 * Email sending using Resend API
 */

import { ENV_VARS } from '../constants/index.js';

/**
 * Email Service Configuration
 */
interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  baseUrl: string; // For generating verification links
}

/**
 * Email Templates
 */
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Email Service
 */
export class EmailService {
  private config: EmailConfig;
  private resendApiUrl = 'https://api.resend.com/emails';

  constructor(config?: Partial<EmailConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env[ENV_VARS.RESEND_API_KEY] || '',
      fromEmail: config?.fromEmail || process.env[ENV_VARS.EMAIL_FROM] || 'noreply@lsh.dev',
      fromName: config?.fromName || 'LSH Secrets Manager',
      baseUrl: config?.baseUrl || process.env[ENV_VARS.BASE_URL] || 'https://app.lsh.dev',
    };

    if (!this.config.apiKey) {
      console.warn('RESEND_API_KEY not set - emails will not be sent');
    }
  }

  /**
   * Send email using Resend API
   */
  // TODO(@gwicho38): Review - sendEmail
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    if (!this.config.apiKey) {
      // Sanitize email parameters to prevent log injection
      const sanitizedTo = params.to.replace(/[\r\n]/g, '');
      const sanitizedSubject = params.subject.replace(/[\r\n]/g, '');
      const sanitizedText = params.text.replace(/[\r\n]/g, ' ');
      console.log('Email would be sent to:', sanitizedTo);
      console.log('Subject:', sanitizedSubject);
      console.log('Text:', sanitizedText);
      return;
    }

    try {
      const response = await fetch(this.resendApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  // TODO(@gwicho38): Review - sendVerificationEmail
  async sendVerificationEmail(to: string, token: string, firstName?: string): Promise<void> {
    const verificationUrl = `${this.config.baseUrl}/verify-email?token=${token}`;
    const name = firstName || 'there';

    const template = this.getVerificationEmailTemplate(name, verificationUrl);

    await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send password reset email
   */
  // TODO(@gwicho38): Review - sendPasswordResetEmail
  async sendPasswordResetEmail(to: string, token: string, firstName?: string): Promise<void> {
    const resetUrl = `${this.config.baseUrl}/reset-password?token=${token}`;
    const name = firstName || 'there';

    const template = this.getPasswordResetTemplate(name, resetUrl);

    await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send organization invitation email
   */
  // TODO(@gwicho38): Review - sendOrganizationInvite
  async sendOrganizationInvite(
    to: string,
    organizationName: string,
    inviterName: string,
    inviteUrl: string
  ): Promise<void> {
    const template = this.getOrganizationInviteTemplate(organizationName, inviterName, inviteUrl);

    await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send welcome email
   */
  // TODO(@gwicho38): Review - sendWelcomeEmail
  async sendWelcomeEmail(to: string, firstName?: string): Promise<void> {
    const name = firstName || 'there';
    const template = this.getWelcomeEmailTemplate(name);

    await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send subscription confirmation
   */
  // TODO(@gwicho38): Review - sendSubscriptionConfirmation
  async sendSubscriptionConfirmation(
    to: string,
    tier: string,
    firstName?: string
  ): Promise<void> {
    const name = firstName || 'there';
    const template = this.getSubscriptionConfirmationTemplate(name, tier);

    await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Email verification template
   */
  // TODO(@gwicho38): Review - getVerificationEmailTemplate
  private getVerificationEmailTemplate(name: string, verificationUrl: string): EmailTemplate {
    return {
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🔐 LSH</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Secrets Manager</p>
          </div>

          <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}! 👋</h2>

            <p>Thanks for signing up for LSH Secrets Manager. Please verify your email address to get started.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${verificationUrl}</p>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 12px; margin: 0;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${name}!

Thanks for signing up for LSH Secrets Manager. Please verify your email address to get started.

Verification link: ${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
LSH Secrets Manager
      `.trim(),
    };
  }

  /**
   * Password reset template
   */
  // TODO(@gwicho38): Review - getPasswordResetTemplate
  private getPasswordResetTemplate(name: string, resetUrl: string): EmailTemplate {
    return {
      subject: 'Reset your password',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🔐 LSH</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Secrets Manager</p>
          </div>

          <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>

            <p>We received a request to reset your password. Click the button below to create a new password.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">Or copy and paste this link:</p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${name},

We received a request to reset your password. Use the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

---
LSH Secrets Manager
      `.trim(),
    };
  }

  /**
   * Organization invite template
   */
  // TODO(@gwicho38): Review - getOrganizationInviteTemplate
  private getOrganizationInviteTemplate(
    organizationName: string,
    inviterName: string,
    inviteUrl: string
  ): EmailTemplate {
    return {
      subject: `You've been invited to join ${organizationName} on LSH`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🔐 LSH</h1>
          </div>

          <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">You've been invited! 🎉</h2>

            <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on LSH Secrets Manager.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Accept Invitation
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">Or copy and paste this link:</p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${inviteUrl}</p>
          </div>
        </body>
        </html>
      `,
      text: `
You've been invited!

${inviterName} has invited you to join ${organizationName} on LSH Secrets Manager.

Accept invitation: ${inviteUrl}

---
LSH Secrets Manager
      `.trim(),
    };
  }

  /**
   * Welcome email template
   */
  // TODO(@gwicho38): Review - getWelcomeEmailTemplate
  private getWelcomeEmailTemplate(name: string): EmailTemplate {
    const dashboardUrl = `${this.config.baseUrl}/dashboard`;
    const docsUrl = 'https://docs.lsh.dev';

    return {
      subject: 'Welcome to LSH Secrets Manager! 🚀',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🔐 LSH</h1>
          </div>

          <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Welcome, ${name}! 🎉</h2>

            <p>Your account is now active. Here's how to get started:</p>

            <ol style="color: #666;">
              <li><strong>Create a team</strong> - Organize your secrets by project or environment</li>
              <li><strong>Add secrets</strong> - Securely store API keys, tokens, and credentials</li>
              <li><strong>Invite team members</strong> - Collaborate securely with your team</li>
              <li><strong>Install the CLI</strong> - <code>npm install -g lsh</code></li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
                Go to Dashboard
              </a>
              <a href="${docsUrl}" style="background: white; color: #667eea; border: 2px solid #667eea; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                View Docs
              </a>
            </div>

            <p style="color: #666;">Need help? Reply to this email or check out our <a href="${docsUrl}" style="color: #667eea;">documentation</a>.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to LSH Secrets Manager, ${name}!

Your account is now active. Here's how to get started:

1. Create a team - Organize your secrets by project or environment
2. Add secrets - Securely store API keys, tokens, and credentials
3. Invite team members - Collaborate securely with your team
4. Install the CLI - npm install -g lsh

Dashboard: ${dashboardUrl}
Documentation: ${docsUrl}

Need help? Reply to this email or check out our documentation.

---
LSH Secrets Manager
      `.trim(),
    };
  }

  /**
   * Subscription confirmation template
   */
  // TODO(@gwicho38): Review - getSubscriptionConfirmationTemplate
  private getSubscriptionConfirmationTemplate(name: string, tier: string): EmailTemplate {
    return {
      subject: `Your ${tier} subscription is active! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🔐 LSH</h1>
          </div>

          <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Thanks, ${name}! 🎉</h2>

            <p>Your <strong>${tier}</strong> subscription is now active. You now have access to:</p>

            <ul style="color: #666;">
              ${
                tier === 'Pro'
                  ? `
              <li>Unlimited team members</li>
              <li>Unlimited secrets</li>
              <li>Unlimited environments</li>
              <li>1-year audit log retention</li>
              <li>Priority support</li>
              `
                  : `
              <li>Multiple organizations</li>
              <li>SSO/SAML integration</li>
              <li>Unlimited audit log retention</li>
              <li>SLA support</li>
              <li>On-premise deployment option</li>
              `
              }
            </ul>

            <p style="color: #666;">Manage your subscription anytime from your account settings.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Thanks, ${name}!

Your ${tier} subscription is now active.

Manage your subscription anytime from your account settings.

---
LSH Secrets Manager
      `.trim(),
    };
  }
}

/**
 * Singleton instance
 */
export const emailService = new EmailService();
