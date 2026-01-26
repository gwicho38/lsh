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
 * Constant-time string comparison to prevent timing attacks.
 *
 * Returns false if strings have different lengths (this leaks length info,
 * which is acceptable for most use cases). For length-hiding comparison,
 * use constantTimeHmacCompare instead.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeStringCompare(a: string, b: string): boolean {
  // Convert to buffers first to get actual byte lengths
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // Different byte lengths - cannot use timingSafeEqual directly
  // Return false in constant time relative to the shorter buffer
  if (bufA.length !== bufB.length) {
    // Still do a timing-safe comparison to avoid early return timing leak
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = bufA.length < maxLen
      ? Buffer.concat([bufA, Buffer.alloc(maxLen - bufA.length)])
      : bufA;
    const paddedB = bufB.length < maxLen
      ? Buffer.concat([bufB, Buffer.alloc(maxLen - bufB.length)])
      : bufB;
    timingSafeEqual(paddedA, paddedB);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Constant-time buffer comparison.
 *
 * @param a - First buffer to compare
 * @param b - Second buffer to compare
 * @returns true if buffers are equal, false otherwise
 */
export function constantTimeBufferCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    // Perform dummy comparison to maintain constant time
    const padded = a.length < b.length
      ? Buffer.concat([a, Buffer.alloc(b.length - a.length)])
      : a;
    const target = a.length < b.length
      ? b
      : Buffer.concat([b, Buffer.alloc(a.length - b.length)]);
    timingSafeEqual(padded, target);
    return false;
  }

  return timingSafeEqual(a, b);
}

/**
 * HMAC-based constant-time comparison that also hides length information.
 *
 * This is useful when you want to compare values without revealing
 * whether length differences exist. Both values are hashed with HMAC
 * before comparison.
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
    .digest('hex');

  return constantTimeStringCompare(signature, expectedHmac);
}

/**
 * Verify an API key in constant time.
 *
 * Normalizes both keys (trim whitespace, normalize unicode)
 * before comparison.
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
