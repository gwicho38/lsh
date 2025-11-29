/**
 * SaaS Email Service Tests
 * Tests for the EmailService class
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Store original env
const originalEnv = { ...process.env };

describe('SaaS Email Service', () => {
  let EmailService: typeof import('../src/lib/saas-email.js').EmailService;
  let emailService: InstanceType<typeof EmailService>;

  beforeAll(async () => {
    const module = await import('../src/lib/saas-email.js');
    EmailService = module.EmailService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Clear env vars
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.BASE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should use provided config values', () => {
      emailService = new EmailService({
        apiKey: 'test-api-key',
        fromEmail: 'custom@test.com',
        fromName: 'Custom Sender',
        baseUrl: 'https://custom.url',
      });

      expect(emailService).toBeDefined();
    });

    it('should use environment variables as fallback', () => {
      process.env.RESEND_API_KEY = 'env-api-key';
      process.env.EMAIL_FROM = 'env@test.com';
      process.env.BASE_URL = 'https://env.url';

      emailService = new EmailService();

      expect(emailService).toBeDefined();
    });

    it('should use default values when nothing provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      emailService = new EmailService();

      expect(consoleSpy).toHaveBeenCalledWith(
        'RESEND_API_KEY not set - emails will not be sent'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Send Email (without API key)', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should log email info when API key not set', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await emailService.sendVerificationEmail('test@example.com', 'token123', 'John');

      expect(consoleSpy).toHaveBeenCalledWith('Email would be sent to:', 'test@example.com');
      expect(consoleSpy).toHaveBeenCalledWith('Subject:', 'Verify your email address');

      consoleSpy.mockRestore();
    });

    it('should sanitize log output', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await emailService.sendVerificationEmail('test@example.com\r\nmalicious', 'token', 'John');

      // Should have sanitized the newlines
      expect(consoleSpy).toHaveBeenCalledWith('Email would be sent to:', 'test@example.commalicious');

      consoleSpy.mockRestore();
    });
  });

  describe('Send Email (with API key)', () => {
    beforeEach(() => {
      emailService = new EmailService({
        apiKey: 'test-api-key',
        fromEmail: 'noreply@test.com',
        fromName: 'Test Sender',
        baseUrl: 'https://test.url',
      });
    });

    it('should send verification email successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-123' }),
      });

      await emailService.sendVerificationEmail('user@example.com', 'verify-token', 'Alice');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.to).toBe('user@example.com');
      expect(callBody.subject).toBe('Verify your email address');
      expect(callBody.html).toContain('Alice');
      expect(callBody.html).toContain('verify-token');
    });

    it('should send password reset email successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-456' }),
      });

      await emailService.sendPasswordResetEmail('user@example.com', 'reset-token', 'Bob');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.to).toBe('user@example.com');
      expect(callBody.subject).toBe('Reset your password');
      expect(callBody.html).toContain('Bob');
      expect(callBody.html).toContain('reset-token');
    });

    it('should send organization invite email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-789' }),
      });

      await emailService.sendOrganizationInvite(
        'invitee@example.com',
        'Acme Corp',
        'John Doe',
        'https://invite.url/abc'
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.to).toBe('invitee@example.com');
      expect(callBody.subject).toContain('Acme Corp');
      expect(callBody.html).toContain('Acme Corp');
      expect(callBody.html).toContain('John Doe');
      expect(callBody.html).toContain('https://invite.url/abc');
    });

    it('should send welcome email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-welcome' }),
      });

      await emailService.sendWelcomeEmail('new@example.com', 'Charlie');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.to).toBe('new@example.com');
      expect(callBody.subject).toContain('Welcome');
      expect(callBody.html).toContain('Charlie');
    });

    it('should send subscription confirmation for Pro tier', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-sub' }),
      });

      await emailService.sendSubscriptionConfirmation('subscriber@example.com', 'Pro', 'Dana');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.subject).toContain('Pro');
      expect(callBody.html).toContain('Pro');
      expect(callBody.html).toContain('Dana');
      expect(callBody.html).toContain('Unlimited team members');
    });

    it('should send subscription confirmation for Enterprise tier', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-ent' }),
      });

      await emailService.sendSubscriptionConfirmation('enterprise@example.com', 'Enterprise', 'Eve');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.html).toContain('SSO/SAML');
      expect(callBody.html).toContain('On-premise');
    });

    it('should use default name when firstName not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-default' }),
      });

      await emailService.sendVerificationEmail('user@example.com', 'token');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.html).toContain('there');
    });

    it('should throw error on failed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid API key',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        emailService.sendVerificationEmail('user@example.com', 'token')
      ).rejects.toThrow('Failed to send email: Invalid API key');

      consoleSpy.mockRestore();
    });

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        emailService.sendVerificationEmail('user@example.com', 'token')
      ).rejects.toThrow('Network error');

      consoleSpy.mockRestore();
    });
  });
});
