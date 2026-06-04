/**
 * w3name pointer ops (issue #194, Phase 2).
 *
 * Durable IPNS via Storacha's w3name: publish a signed record mapping the
 * key-derived IPNS name → `/ipfs/<cid>`, hosted at name.web3.storage (no account,
 * no auth). The name is IDENTICAL to the one Kubo derives from the same seed
 * (verified in the Phase-2 spike), so this shares one logical pointer with the
 * IPNS-over-DHT backend.
 *
 * w3name + @libp2p/crypto are heavy ESM deps; they are **lazily imported** inside
 * the functions so the CLI / unit tests don't load them unless w3name is actually
 * used.
 */

import { createLogger } from './logger.js';

const logger = createLogger('W3namePointer');

const PUBLISH_TIMEOUT_MS = 15000;
const RESOLVE_TIMEOUT_MS = 10000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => reject(new Error(`w3name ${label} timed out after ${ms}ms`)), ms);
      timer.unref?.();
    }),
  ]);
}

/** Build a w3name WritableName from a 32-byte ed25519 seed (deterministic). */
async function writableFromSeed(seed: Buffer) {
  const [{ generateKeyPairFromSeed, privateKeyToProtobuf }, Name] = await Promise.all([
    import('@libp2p/crypto/keys'),
    import('w3name'),
  ]);
  const priv = await generateKeyPairFromSeed('Ed25519', new Uint8Array(seed));
  const name = await Name.from(privateKeyToProtobuf(priv));
  return { Name, name };
}

/**
 * Publish `cid` under the seed-derived w3name pointer. Returns the IPNS name.
 * Handles IPNS sequencing: increments from the current revision if one exists,
 * else publishes v0.
 */
export async function w3namePublish(seed: Buffer, cid: string): Promise<string> {
  const { Name, name } = await writableFromSeed(seed);
  const value = `/ipfs/${cid}`;

  let revision;
  try {
    const current = await withTimeout(Name.resolve(name), RESOLVE_TIMEOUT_MS, 'resolve(pre-publish)');
    revision = await Name.increment(current, value);
  } catch {
    // No existing record (or unresolvable) → start a fresh revision.
    revision = await Name.v0(name, value);
  }

  await withTimeout(Name.publish(revision, name.key), PUBLISH_TIMEOUT_MS, 'publish');
  logger.debug(`Published to w3name: ${name.toString()} → ${value}`);
  return name.toString();
}

/** Resolve the latest CID for the seed-derived w3name pointer. */
export async function w3nameResolve(seed: Buffer): Promise<{ cid: string | null; name: string }> {
  const { Name, name } = await writableFromSeed(seed);
  const nameStr = name.toString();
  try {
    const revision = await withTimeout(Name.resolve(Name.parse(nameStr)), RESOLVE_TIMEOUT_MS, 'resolve');
    const value = revision.value as string; // "/ipfs/<cid>"
    const cid = value.startsWith('/ipfs/') ? value.slice('/ipfs/'.length) : null;
    return { cid, name: nameStr };
  } catch (error) {
    logger.debug(`w3name resolve failed for ${nameStr}: ${(error as Error).message}`);
    return { cid: null, name: nameStr };
  }
}
