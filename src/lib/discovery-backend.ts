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

/**
 * Select the discovery backend. Currently always IPNS (behaviour-preserving).
 * Phase 2 (issue #194) will read a `LSH_DISCOVERY` setting to choose/compose
 * backends (e.g. w3name primary + ipns fallback).
 */
export function getDiscoveryBackend(
  ipfsSync: Pick<IPFSSync, 'getApiUrl' | 'publishToIPNS' | 'resolveIPNS'>,
): DiscoveryBackend {
  return new IpnsDiscoveryBackend(ipfsSync);
}
