/**
 * IPNS Key Manager
 *
 * Deterministic IPNS key derivation from LSH_SECRETS_KEY.
 * Same key + repo + env always produces the same IPNS name,
 * so teammates only need to share the encryption key.
 */
export interface IPNSKeyInfo {
    keyName: string;
    seed: Buffer;
}
/**
 * Derive deterministic IPNS key info from secrets key + repo + env.
 * Same inputs always produce the same key.
 */
export declare function deriveKeyInfo(secretsKey: string, repoName: string, environment: string): IPNSKeyInfo;
/**
 * Build a PEM-encoded PKCS8 ed25519 private key from a 32-byte seed.
 * This is the format Kubo's /key/import accepts with format=pem-pkcs8-cleartext.
 */
export declare function buildPemFromSeed(seed: Buffer): string;
/**
 * Ensure the derived key is imported into the local Kubo node.
 * Idempotent: checks /key/list first, only imports if missing.
 * Returns the IPNS name (peer ID) on success, null on failure.
 */
export declare function ensureKeyImported(kuboApiUrl: string, keyInfo: IPNSKeyInfo): Promise<string | null>;
