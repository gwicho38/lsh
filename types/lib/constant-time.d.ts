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
export declare function constantTimeStringCompare(a: string, b: string): boolean;
/**
 * Constant-time buffer comparison.
 *
 * @param a - First buffer to compare
 * @param b - Second buffer to compare
 * @returns true if buffers are equal, false otherwise
 */
export declare function constantTimeBufferCompare(a: Buffer, b: Buffer): boolean;
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
export declare function constantTimeHmacCompare(a: string, b: string, key: string): boolean;
/**
 * Verify an HMAC signature in constant time.
 *
 * @param payload - The payload that was signed
 * @param signature - The HMAC signature to verify (hex encoded)
 * @param secret - The secret key used to create the HMAC
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns true if signature is valid, false otherwise
 */
export declare function verifyHmacSignature(payload: string, signature: string, secret: string, algorithm?: 'sha256' | 'sha512'): boolean;
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
export declare function verifyApiKey(providedKey: string, storedKey: string): boolean;
