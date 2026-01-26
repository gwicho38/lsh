/**
 * Constant-Time Comparison Utilities
 *
 * This module provides timing-attack-resistant comparison functions
 * for security-sensitive operations like:
 * - API key validation
 * - HMAC signature verification
 * - Secret comparison
 *
 * Standard string comparison (===) can leak information about
 * the compared values through timing differences. These functions
 * use Node.js crypto.timingSafeEqual to prevent such attacks.
 *
 * @see https://codahale.com/a-lesson-in-timing-attacks/
 */

import { timingSafeEqual, createHmac } from 'crypto';

/**
 * Internal helper: Performs constant-time comparison with padding for unequal lengths.
 *
 * On length mismatch, pads the shorter buffer with zeros and performs a dummy
 * constant-time comparison before returning false. This avoids obvious early-return
 * timing differences, though the return value still leaks length inequality.
 *
 * @internal
 */
function constantTimeEqualWithPadding(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    const maxLen = Math.max(a.length, b.length);
    const paddedA = a.length < maxLen
      ? Buffer.concat([a, Buffer.alloc(maxLen - a.length)])
      : a;
    const paddedB = b.length < maxLen
      ? Buffer.concat([b, Buffer.alloc(maxLen - b.length)])
      : b;

    // Dummy comparison to maintain constant time
    timingSafeEqual(paddedA, paddedB);
    return false;
  }

  return timingSafeEqual(a, b);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * On length mismatch, still performs a dummy constant-time comparison
 * (with zero-padding) and returns false. This leaks length information
 * via the return value, but avoids obvious early-return timing differences.
 * For fully length-hiding comparison, use constantTimeHmacCompare instead.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeStringCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return constantTimeEqualWithPadding(bufA, bufB);
}

/**
 * Constant-time buffer comparison.
 *
 * On length mismatch, still performs a dummy constant-time comparison
 * (with zero-padding) and returns false. This leaks length information
 * via the return value, but avoids obvious early-return timing differences.
 *
 * @param a - First buffer to compare
 * @param b - Second buffer to compare
 * @returns true if buffers are equal, false otherwise
 */
export function constantTimeBufferCompare(a: Buffer, b: Buffer): boolean {
  return constantTimeEqualWithPadding(a, b);
}

/**
 * HMAC-based constant-time comparison that also hides length information.
 *
 * This is useful when you want to compare values without revealing
 * whether length differences exist. Both values are hashed with HMAC
 * before comparison, producing fixed-length outputs.
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @param key - HMAC key (can be any consistent value)
 * @returns true if values are equal, false otherwise
 */
export function constantTimeHmacCompare(a: string, b: string, key: string): boolean {
  const hmacA = createHmac('sha256', key).update(a).digest();
  const hmacB = createHmac('sha256', key).update(b).digest();

  return timingSafeEqual(hmacA, hmacB);
}

/**
 * Verify an HMAC signature in constant time.
 *
 * Computes the expected HMAC and compares it directly as buffers,
 * avoiding intermediate string handling for better security.
 *
 * @param payload - The payload that was signed
 * @param signature - The HMAC signature to verify (hex encoded)
 * @param secret - The secret key used to create the HMAC
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns true if signature is valid, false otherwise
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  const expectedHmac = createHmac(algorithm, secret)
    .update(payload)
    .digest();

  // Convert signature from hex to buffer for direct comparison
  const signatureBuffer = Buffer.from(signature, 'hex');

  return constantTimeBufferCompare(signatureBuffer, expectedHmac);
}

/**
 * Verify an API key in constant time.
 *
 * Normalizes both keys (trim whitespace, normalize unicode)
 * before comparison. This is appropriate for text-based API keys.
 * For opaque binary tokens, use constantTimeStringCompare or
 * constantTimeBufferCompare directly without normalization.
 *
 * @param providedKey - The API key provided by the client
 * @param storedKey - The stored/expected API key
 * @returns true if keys match, false otherwise
 */
export function verifyApiKey(providedKey: string, storedKey: string): boolean {
  // Normalize both keys
  const normalizedProvided = providedKey.trim().normalize('NFC');
  const normalizedStored = storedKey.trim().normalize('NFC');

  return constantTimeStringCompare(normalizedProvided, normalizedStored);
}
