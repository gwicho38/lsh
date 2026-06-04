/**
 * Discovery backend seam.
 *
 * "Discovery" = mapping a key-derived pointer to the latest content CID
 * (publish on push, resolve on pull). Today the only backend is IPNS over the
 * DHT (`IpnsDiscoveryBackend`), which is what LSH has always used — this module
 * just extracts that behind an interface so additional backends (e.g. a durable
 * w3name pointer; see issue #194) can be added without touching the storage layer.
 *
 * This is a behaviour-preserving refactor: `getDiscoveryBackend()` returns the
 * IPNS backend, identical to the previous inline logic.
 */

import type { IPFSSync } from './ipfs-sync.js';
import {
  deriveKeyInfo as defaultDeriveKeyInfo,
  ensureKeyImported as defaultEnsureKeyImported,
  type IPNSKeyInfo,
} from './ipns-key-manager.js';
import {
  w3namePublish as defaultW3namePublish,
  w3nameResolve as defaultW3nameResolve,
} from './w3name-pointer.js';
import { ENV_VARS, DEFAULTS } from '../constants/config.js';
import { createLogger } from './logger.js';

const logger = createLogger('Discovery');

export interface DiscoveryPublishParams {
  secretsKey: string;
  repoName: string;
  env: string;
  cid: string;
}

export interface DiscoveryResolveParams {
  secretsKey: string;
  repoName: string;
  env: string;
}

export interface DiscoveryResolveResult {
  /** Latest CID for the derived pointer, or null if unresolved. */
  cid: string | null;
  /** The pointer name (IPNS name / peer id), or null if the key couldn't be prepared. */
  name: string | null;
}

export interface DiscoveryBackend {
  /** Stable identifier, e.g. 'ipns'. */
  readonly id: string;
  /** Publish `cid` under the key-derived pointer. Returns the pointer name, or null on failure. */
  publish(params: DiscoveryPublishParams): Promise<string | null>;
  /** Resolve the latest CID for the key-derived pointer. */
  resolve(params: DiscoveryResolveParams): Promise<DiscoveryResolveResult>;
}

/** Injectable dependencies (defaults are the real implementations; tests override). */
export interface IpnsBackendDeps {
  deriveKeyInfo: (secretsKey: string, repoName: string, env: string) => IPNSKeyInfo;
  ensureKeyImported: (kuboApiUrl: string, keyInfo: IPNSKeyInfo) => Promise<string | null>;
}

/**
 * IPNS-over-DHT discovery: derive a deterministic ed25519 key from the secrets
 * key, import it into the local Kubo keystore, and publish/resolve via IPNS.
 */
export class IpnsDiscoveryBackend implements DiscoveryBackend {
  readonly id = 'ipns';

  constructor(
    private readonly ipfsSync: Pick<IPFSSync, 'getApiUrl' | 'publishToIPNS' | 'resolveIPNS'>,
    private readonly deps: IpnsBackendDeps = {
      deriveKeyInfo: defaultDeriveKeyInfo,
      ensureKeyImported: defaultEnsureKeyImported,
    },
  ) {}

  async publish({ secretsKey, repoName, env, cid }: DiscoveryPublishParams): Promise<string | null> {
    const keyInfo = this.deps.deriveKeyInfo(secretsKey, repoName, env);
    const ipnsName = await this.deps.ensureKeyImported(this.ipfsSync.getApiUrl(), keyInfo);
    if (!ipnsName) {
      return null;
    }
    return this.ipfsSync.publishToIPNS(cid, keyInfo.keyName);
  }

  async resolve({ secretsKey, repoName, env }: DiscoveryResolveParams): Promise<DiscoveryResolveResult> {
    const keyInfo = this.deps.deriveKeyInfo(secretsKey, repoName, env);
    const ipnsName = await this.deps.ensureKeyImported(this.ipfsSync.getApiUrl(), keyInfo);
    if (!ipnsName) {
      return { cid: null, name: null };
    }
    const cid = await this.ipfsSync.resolveIPNS(ipnsName);
    return { cid, name: ipnsName };
  }
}

/** Injectable w3name ops (defaults are the real network impls; tests override). */
export interface W3nameBackendDeps {
  deriveKeyInfo: (secretsKey: string, repoName: string, env: string) => IPNSKeyInfo;
  publish: (seed: Buffer, cid: string) => Promise<string>;
  resolve: (seed: Buffer) => Promise<{ cid: string | null; name: string }>;
}

/**
 * Durable discovery via w3name (Storacha). Publishes/resolves a signed IPNS
 * record hosted at name.web3.storage — survives offline nodes, no DHT TTL, no
 * account. Uses the SAME seed-derived IPNS name as the `ipns` backend.
 */
export class W3nameDiscoveryBackend implements DiscoveryBackend {
  readonly id = 'w3name';

  constructor(
    private readonly deps: W3nameBackendDeps = {
      deriveKeyInfo: defaultDeriveKeyInfo,
      publish: defaultW3namePublish,
      resolve: defaultW3nameResolve,
    },
  ) {}

  async publish({ secretsKey, repoName, env, cid }: DiscoveryPublishParams): Promise<string | null> {
    const { seed } = this.deps.deriveKeyInfo(secretsKey, repoName, env);
    return this.deps.publish(seed, cid);
  }

  async resolve({ secretsKey, repoName, env }: DiscoveryResolveParams): Promise<DiscoveryResolveResult> {
    const { seed } = this.deps.deriveKeyInfo(secretsKey, repoName, env);
    return this.deps.resolve(seed);
  }
}

/**
 * Composes backends in priority order. Publish dual-writes to all (best-effort —
 * a failure in one doesn't block the others). Resolve tries each in order and
 * returns the first hit, so a durable backend wins but a fallback still works.
 */
export class CompositeDiscoveryBackend implements DiscoveryBackend {
  readonly id: string;

  constructor(private readonly backends: DiscoveryBackend[]) {
    this.id = backends.map((b) => b.id).join('+');
  }

  async publish(params: DiscoveryPublishParams): Promise<string | null> {
    let firstName: string | null = null;
    for (const backend of this.backends) {
      try {
        const name = await backend.publish(params);
        if (name && !firstName) {
          firstName = name;
        }
      } catch (error) {
        logger.warn(`Discovery publish via "${backend.id}" failed: ${(error as Error).message}`);
      }
    }
    return firstName;
  }

  async resolve(params: DiscoveryResolveParams): Promise<DiscoveryResolveResult> {
    let firstName: string | null = null;
    for (const backend of this.backends) {
      try {
        const result = await backend.resolve(params);
        if (result.name && !firstName) {
          firstName = result.name;
        }
        if (result.cid) {
          return result;
        }
      } catch (error) {
        logger.warn(`Discovery resolve via "${backend.id}" failed: ${(error as Error).message}`);
      }
    }
    return { cid: null, name: firstName };
  }
}

/** Construct a single backend by id, or null if unknown. */
function buildBackend(
  id: string,
  ipfsSync: Pick<IPFSSync, 'getApiUrl' | 'publishToIPNS' | 'resolveIPNS'>,
): DiscoveryBackend | null {
  switch (id) {
    case 'ipns':
      return new IpnsDiscoveryBackend(ipfsSync);
    case 'w3name':
      return new W3nameDiscoveryBackend();
    default:
      logger.warn(`Unknown discovery backend "${id}" — ignoring.`);
      return null;
  }
}

/**
 * Select discovery backend(s) from `LSH_DISCOVERY` (comma-separated, priority
 * order; default 'w3name,ipns'). Returns a single backend or a composite.
 * Falls back to IPNS if the setting resolves to nothing valid.
 */
export function getDiscoveryBackend(
  ipfsSync: Pick<IPFSSync, 'getApiUrl' | 'publishToIPNS' | 'resolveIPNS'>,
): DiscoveryBackend {
  const setting = process.env[ENV_VARS.LSH_DISCOVERY] || DEFAULTS.DISCOVERY_BACKENDS;
  const backends = setting
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((id) => buildBackend(id, ipfsSync))
    .filter((b): b is DiscoveryBackend => b !== null);

  if (backends.length === 0) {
    return new IpnsDiscoveryBackend(ipfsSync);
  }
  return backends.length === 1 ? backends[0] : new CompositeDiscoveryBackend(backends);
}
