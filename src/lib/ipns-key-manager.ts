/**
 * IPNS Key Manager
 *
 * Deterministic IPNS key derivation from LSH_SECRETS_KEY.
 * Same key + repo + env always produces the same IPNS name,
 * so teammates only need to share the encryption key.
 */

import * as crypto from 'crypto';
import { DEFAULTS } from '../constants/config.js';
import { createLogger } from './logger.js';

const logger = createLogger('IPNSKeyManager');

export interface IPNSKeyInfo {
  keyName: string;   // Kubo keystore name, e.g. "lsh-3c3080bd2a8c73b0"
  seed: Buffer;      // 32-byte ed25519 seed
}

// PKCS8 DER prefix for ed25519 private keys (RFC 8410)
// This wraps a raw 32-byte seed into a valid PKCS8 structure.
const ED25519_PKCS8_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex'
);

/**
 * Derive deterministic IPNS key info from secrets key + repo + env.
 * Same inputs always produce the same key.
 */
export function deriveKeyInfo(
  secretsKey: string,
  repoName: string,
  environment: string
): IPNSKeyInfo {
  const context = `${DEFAULTS.IPNS_KEY_DERIVATION_CONTEXT}:${repoName}:${environment}`;
  const seed = crypto.createHmac('sha256', secretsKey)
    .update(context)
    .digest();

  const keyName = DEFAULTS.IPNS_KEY_PREFIX +
    crypto.createHash('sha256').update(seed).digest('hex').substring(0, 16);

  return { keyName, seed };
}

/**
 * Build a PEM-encoded PKCS8 ed25519 private key from a 32-byte seed.
 * This is the format Kubo's /key/import accepts with format=pem-pkcs8-cleartext.
 */
export function buildPemFromSeed(seed: Buffer): string {
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);
  const b64 = pkcs8Der.toString('base64');
  const lines = b64.match(/.{1,64}/g) || [b64];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

/**
 * Ensure the derived key is imported into the local Kubo node.
 * Idempotent: checks /key/list first, only imports if missing.
 * Returns the IPNS name (peer ID) on success, null on failure.
 */
export async function ensureKeyImported(
  kuboApiUrl: string,
  keyInfo: IPNSKeyInfo
): Promise<string | null> {
  try {
    // Check if key already exists
    const listResponse = await fetch(`${kuboApiUrl}/key/list`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });

    if (listResponse.ok) {
      const listData = await listResponse.json() as { Keys: Array<{ Name: string; Id: string }> };
      const existing = listData.Keys?.find(k => k.Name === keyInfo.keyName);
      if (existing) {
        logger.debug(`IPNS key "${keyInfo.keyName}" already imported: ${existing.Id}`);
        return existing.Id;
      }
    }

    // Import the key
    const pem = buildPemFromSeed(keyInfo.seed);
    const formData = new FormData();
    const blob = new Blob([pem], { type: 'application/x-pem-file' });
    formData.append('file', blob, 'key.pem');

    const importResponse = await fetch(
      `${kuboApiUrl}/key/import?arg=${encodeURIComponent(keyInfo.keyName)}&format=pem-pkcs8-cleartext`,
      {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      logger.warn(`Failed to import IPNS key: ${errorText}`);
      return null;
    }

    const importData = await importResponse.json() as { Name: string; Id: string };
    logger.info(`Imported IPNS key "${importData.Name}": ${importData.Id}`);
    return importData.Id;
  } catch (error) {
    const err = error as Error;
    logger.debug(`IPNS key import failed: ${err.message}`);
    return null;
  }
}
