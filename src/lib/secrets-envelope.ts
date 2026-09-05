/**
 * Versioned AEAD envelope for LSH secrets payloads.
 *
 * Every sync path (`lsh push`, `lsh sync push`, `lsh sync now`) writes the same
 * self-describing envelope: a version, the algorithm name, bounded authenticated
 * metadata, a fresh nonce, the ciphertext, and a GCM authentication tag.
 *
 * Reads accept the envelope and the legacy unauthenticated two-part
 * `ivHex:ciphertextHex` AES-256-CBC form. Legacy payloads are decrypted for
 * migration only; they are never written and are never silently re-published.
 *
 * Wire format (single-line JSON):
 *   {"v":1,"alg":"aes-256-gcm","meta":{...},"iv":"<hex>","tag":"<hex>","ct":"<hex>"}
 *
 * The additional authenticated data is the canonical serialization of
 * `{v, alg, meta}`, so tampering with the version, the algorithm name, or the
 * metadata fails authentication before any plaintext is produced.
 */

import crypto from 'crypto';
import { CRYPTO } from '../constants/config.js';
import { ERRORS } from '../constants/errors.js';
import { LSHError, ErrorCodes } from './lsh-error.js';

/** Current envelope version. Bump only on a breaking wire-format change. */
export const ENVELOPE_VERSION = CRYPTO.ENVELOPE_VERSION;

/** Algorithm used for every new write. */
export const ENVELOPE_ALGORITHM = CRYPTO.AEAD_ALGORITHM;

/** Algorithm accepted for migration reads only. */
export const LEGACY_ALGORITHM = CRYPTO.LEGACY_ALGORITHM;

/** Upper bound on a payload accepted for parsing. */
export const MAX_ENVELOPE_BYTES = CRYPTO.MAX_ENVELOPE_BYTES;

/** Upper bound on the serialized authenticated metadata. */
export const MAX_METADATA_BYTES = CRYPTO.MAX_METADATA_BYTES;

const NONCE_BYTES = CRYPTO.AEAD_NONCE_BYTES;
const AUTH_TAG_BYTES = CRYPTO.AEAD_TAG_BYTES;
const LEGACY_IV_BYTES = CRYPTO.LEGACY_IV_BYTES;

/**
 * Bounded, authenticated envelope metadata.
 *
 * `payload` names the shape of the plaintext so a reader can report a mismatch
 * instead of guessing. It is descriptive only; payload unification is issue #225.
 */
export interface EnvelopeMetadata {
  environment?: string;
  repo?: string;
  payload?: string;
}

export interface DecryptedEnvelope {
  /** Authenticated plaintext. */
  plaintext: string;
  /** True when the source was the legacy unauthenticated CBC form. */
  legacy: boolean;
  /** Authenticated metadata (empty for legacy payloads). */
  meta: EnvelopeMetadata;
}

const METADATA_KEYS: readonly (keyof EnvelopeMetadata)[] = ['environment', 'payload', 'repo'];

function encryptionError(message: string, context?: Record<string, unknown>): LSHError {
  return new LSHError(ErrorCodes.SECRETS_ENCRYPTION_FAILED, message, context);
}

function decryptionError(message: string, context?: Record<string, unknown>): LSHError {
  return new LSHError(ErrorCodes.SECRETS_DECRYPTION_FAILED, message, context);
}

/** Derive the 32-byte content key. Matches the historical derivation so legacy payloads stay readable. */
function deriveKey(encryptionKey: string): Buffer {
  if (typeof encryptionKey !== 'string' || encryptionKey.length === 0) {
    throw encryptionError(ERRORS.ENVELOPE_KEY_REQUIRED);
  }
  return crypto.createHash(CRYPTO.KEY_DERIVATION_HASH).update(encryptionKey).digest();
}

/** Reduce metadata to known string keys in a stable order, and enforce the size bound. */
function canonicalizeMetadata(meta: unknown, bound: () => LSHError): EnvelopeMetadata {
  if (meta === undefined || meta === null) return {};
  if (typeof meta !== 'object' || Array.isArray(meta)) {
    throw bound();
  }

  const source = meta as Record<string, unknown>;
  const canonical: EnvelopeMetadata = {};

  for (const key of Object.keys(source)) {
    if (!METADATA_KEYS.includes(key as keyof EnvelopeMetadata)) {
      throw bound();
    }
    const value = source[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      throw bound();
    }
    canonical[key as keyof EnvelopeMetadata] = value;
  }

  const ordered: EnvelopeMetadata = {};
  for (const key of METADATA_KEYS) {
    if (canonical[key] !== undefined) ordered[key] = canonical[key];
  }

  if (Buffer.byteLength(JSON.stringify(ordered), 'utf8') > MAX_METADATA_BYTES) {
    throw bound();
  }

  return ordered;
}

/** Additional authenticated data: the envelope header, canonically serialized. */
function buildAAD(version: number, algorithm: string, meta: EnvelopeMetadata): Buffer {
  return Buffer.from(JSON.stringify({ v: version, alg: algorithm, meta }), 'utf8');
}

function decodeHex(value: unknown, expectedBytes: number | undefined, field: string): Buffer {
  if (typeof value !== 'string' || value.length === 0 || !/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) {
    throw decryptionError(ERRORS.ENVELOPE_MALFORMED, { field });
  }
  const buffer = Buffer.from(value, 'hex');
  if (expectedBytes !== undefined && buffer.length !== expectedBytes) {
    throw decryptionError(ERRORS.ENVELOPE_MALFORMED, { field });
  }
  return buffer;
}

/**
 * True when the payload is the legacy unauthenticated `ivHex:ciphertextHex` form.
 * The AEAD envelope is JSON, so the first non-space character discriminates them.
 */
export function isLegacyEnvelope(payload: string): boolean {
  return !payload.trimStart().startsWith('{');
}

/**
 * Encrypt a plaintext payload into a versioned AES-256-GCM envelope.
 */
export function encryptEnvelope(
  plaintext: string,
  encryptionKey: string,
  meta: EnvelopeMetadata = {}
): string {
  const key = deriveKey(encryptionKey);
  const canonicalMeta = canonicalizeMetadata(meta, () =>
    encryptionError(ERRORS.ENVELOPE_METADATA_INVALID, { maxBytes: MAX_METADATA_BYTES })
  );

  const iv = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv(ENVELOPE_ALGORITHM, key, iv);
  cipher.setAAD(buildAAD(ENVELOPE_VERSION, ENVELOPE_ALGORITHM, canonicalMeta));

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    v: ENVELOPE_VERSION,
    alg: ENVELOPE_ALGORITHM,
    meta: canonicalMeta,
    iv: iv.toString('hex'),
    tag: authTag.toString('hex'),
    ct: ciphertext.toString('hex'),
  });
}

/**
 * Decrypt an envelope or a legacy CBC payload.
 *
 * For envelopes the authentication tag is verified before any plaintext is
 * returned, so a caller can safely write the result to disk.
 */
export function decryptEnvelope(payload: string, encryptionKey: string): DecryptedEnvelope {
  if (typeof payload !== 'string' || payload.trim().length === 0) {
    throw decryptionError(ERRORS.ENVELOPE_EMPTY);
  }
  if (Buffer.byteLength(payload, 'utf8') > MAX_ENVELOPE_BYTES) {
    throw decryptionError(ERRORS.ENVELOPE_TOO_LARGE, { maxBytes: MAX_ENVELOPE_BYTES });
  }

  const key = deriveKey(encryptionKey);

  if (isLegacyEnvelope(payload)) {
    return decryptLegacy(payload, key);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(payload) as Record<string, unknown>;
  } catch (error) {
    throw decryptionError(ERRORS.ENVELOPE_MALFORMED, { reason: String(error) });
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw decryptionError(ERRORS.ENVELOPE_MALFORMED);
  }
  if (parsed.v !== ENVELOPE_VERSION) {
    throw decryptionError(ERRORS.ENVELOPE_UNSUPPORTED_VERSION, { version: parsed.v });
  }
  if (parsed.alg !== ENVELOPE_ALGORITHM) {
    throw decryptionError(ERRORS.ENVELOPE_UNSUPPORTED_ALGORITHM, { algorithm: parsed.alg });
  }

  const meta = canonicalizeMetadata(parsed.meta, () =>
    decryptionError(ERRORS.ENVELOPE_METADATA_INVALID, { maxBytes: MAX_METADATA_BYTES })
  );

  const iv = decodeHex(parsed.iv, NONCE_BYTES, 'iv');
  const authTag = decodeHex(parsed.tag, AUTH_TAG_BYTES, 'tag');
  const ciphertext = typeof parsed.ct === 'string' && parsed.ct.length === 0
    ? Buffer.alloc(0)
    : decodeHex(parsed.ct, undefined, 'ct');

  try {
    const decipher = crypto.createDecipheriv(ENVELOPE_ALGORITHM, key, iv);
    decipher.setAAD(buildAAD(ENVELOPE_VERSION, ENVELOPE_ALGORITHM, meta));
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return { plaintext, legacy: false, meta };
  } catch (error) {
    throw decryptionError(ERRORS.ENVELOPE_AUTHENTICATION_FAILED, { cause: String(error) });
  }
}

function decryptLegacy(payload: string, key: Buffer): DecryptedEnvelope {
  const parts = payload.trim().split(':');
  if (parts.length !== 2) {
    throw decryptionError(ERRORS.ENVELOPE_MALFORMED, { field: 'legacy' });
  }

  const iv = decodeHex(parts[0], LEGACY_IV_BYTES, 'iv');
  const ciphertext = decodeHex(parts[1], undefined, 'ct');

  try {
    const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, key, iv);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return { plaintext, legacy: true, meta: {} };
  } catch (error) {
    throw decryptionError(ERRORS.ENVELOPE_LEGACY_DECRYPT_FAILED, { cause: String(error) });
  }
}
