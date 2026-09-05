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
/** Current envelope version. Bump only on a breaking wire-format change. */
export declare const ENVELOPE_VERSION: 1;
/** Algorithm used for every new write. */
export declare const ENVELOPE_ALGORITHM: "aes-256-gcm";
/** Algorithm accepted for migration reads only. */
export declare const LEGACY_ALGORITHM: "aes-256-cbc";
/** Upper bound on a payload accepted for parsing. */
export declare const MAX_ENVELOPE_BYTES: number;
/** Upper bound on the serialized authenticated metadata. */
export declare const MAX_METADATA_BYTES: 1024;
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
/**
 * True when the payload is the legacy unauthenticated `ivHex:ciphertextHex` form.
 * The AEAD envelope is JSON, so the first non-space character discriminates them.
 */
export declare function isLegacyEnvelope(payload: string): boolean;
/**
 * Encrypt a plaintext payload into a versioned AES-256-GCM envelope.
 */
export declare function encryptEnvelope(plaintext: string, encryptionKey: string, meta?: EnvelopeMetadata): string;
/**
 * Decrypt an envelope or a legacy CBC payload.
 *
 * For envelopes the authentication tag is verified before any plaintext is
 * returned, so a caller can safely write the result to disk.
 */
export declare function decryptEnvelope(payload: string, encryptionKey: string): DecryptedEnvelope;
