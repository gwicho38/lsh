/**
 * Tests for saas-email.ts error handling
 * Verifies LSHError is thrown with correct error codes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch for Resend API calls
const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch as unknown as typeof fetch;

import { EmailService } from '../lib/saas-email.js';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('EmailService Error Handling', () => {
  let emailService: EmailService;

  beforeEach(() => {
    mockFetch.mockReset();
    // Create service with API key to enable actual sending
    emailService = new EmailService({
      apiKey: 'test-api-key',
      fromEmail: 'test@lsh.dev',
      fromName: 'Test',
      baseUrl: 'https://test.lsh.dev',
    });
  });

  describe('sendEmail (private method via sendVerificationEmail)', () => {
    it('should throw LSHError with SERVICE_UNAVAILABLE when Resend API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Invalid email address'),
      });

      await expect(
        emailService.sendVerificationEmail('invalid-email', 'token123', 'Test')
      ).rejects.toMatchObject({
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: expect.stringContaining('Failed to send email'),
        context: expect.objectContaining({
          to: 'invalid-email',
          statusCode: 400,
          apiError: 'Invalid email address',
        }),
      });
    });

    it('should throw LSHError with SERVICE_UNAVAILABLE when Resend API is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        emailService.sendVerificationEmail('test@example.com', 'token123', 'Test')
      ).rejects.toMatchObject({
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: expect.stringContaining('Email service error'),
        context: expect.objectContaining({
          to: 'test@example.com',
          originalError: expect.stringContaining('Network error'),
        }),
      });
    });

    it('should throw LSHError with SERVICE_UNAVAILABLE on 500 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal server error'),
      });

      await expect(
        emailService.sendPasswordResetEmail('test@example.com', 'token123', 'Test')
      ).rejects.toMatchObject({
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        context: expect.objectContaining({
          statusCode: 500,
        }),
      });
    });

    it('should throw LSHError with SERVICE_UNAVAILABLE on 429 rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limit exceeded'),
      });

      await expect(emailService.sendWelcomeEmail('test@example.com', 'Test')).rejects.toMatchObject({
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        context: expect.objectContaining({
          statusCode: 429,
          apiError: 'Rate limit exceeded',
        }),
      });
    });
  });

  describe('successful email sending', () => {
    it('should not throw when email is sent successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email_123' }),
      });

      await expect(
        emailService.sendVerificationEmail('test@example.com', 'token123', 'Test')
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should send all email types successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email_123' }),
      });

      // Test all email methods
      await expect(
        emailService.sendVerificationEmail('test@example.com', 'token123')
      ).resolves.toBeUndefined();

      await expect(
        emailService.sendPasswordResetEmail('test@example.com', 'token123')
      ).resolves.toBeUndefined();

      await expect(
        emailService.sendOrganizationInvite(
          'test@example.com',
          'Org Name',
          'Inviter',
          'https://invite.url'
        )
      ).resolves.toBeUndefined();

      await expect(emailService.sendWelcomeEmail('test@example.com')).resolves.toBeUndefined();

      await expect(
        emailService.sendSubscriptionConfirmation('test@example.com', 'Pro')
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });

  describe('email logging when API key is not set', () => {
    it('should log email details without throwing when API key is missing', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const serviceWithoutKey = new EmailService({
        apiKey: '',
        fromEmail: 'test@lsh.dev',
        fromName: 'Test',
        baseUrl: 'https://test.lsh.dev',
      });

      await expect(
        serviceWithoutKey.sendVerificationEmail('test@example.com', 'token123', 'Test')
      ).resolves.toBeUndefined();

      // Should log the email details instead of sending
      expect(consoleSpy).toHaveBeenCalledWith('Email would be sent to:', 'test@example.com');

      consoleSpy.mockRestore();
    });

    it('should sanitize email parameters in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const serviceWithoutKey = new EmailService({
        apiKey: '',
        fromEmail: 'test@lsh.dev',
        fromName: 'Test',
        baseUrl: 'https://test.lsh.dev',
      });

      // Try to inject newlines into email
      await serviceWithoutKey.sendVerificationEmail('test@example.com\r\nBcc: hacker@evil.com', 'token', 'Test');

      // The logged email should have newlines removed
      expect(consoleSpy).toHaveBeenCalledWith(
        'Email would be sent to:',
        'test@example.comBcc: hacker@evil.com'
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('LSHError for Email Service', () => {
  it('should use SERVICE_UNAVAILABLE code with 503 status', () => {
    const error = new LSHError(ErrorCodes.SERVICE_UNAVAILABLE, 'Email service error', {
      to: 'test@example.com',
    });

    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('should preserve context information', () => {
    const error = new LSHError(ErrorCodes.SERVICE_UNAVAILABLE, 'Failed to send email', {
      to: 'test@example.com',
      subject: 'Test Subject',
      statusCode: 400,
      apiError: 'Invalid recipient',
    });

    expect(error.context?.to).toBe('test@example.com');
    expect(error.context?.subject).toBe('Test Subject');
    expect(error.context?.statusCode).toBe(400);
    expect(error.context?.apiError).toBe('Invalid recipient');
  });
});
