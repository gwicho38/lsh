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
import { type IPNSKeyInfo } from './ipns-key-manager.js';
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
export declare class IpnsDiscoveryBackend implements DiscoveryBackend {
    private readonly ipfsSync;
    private readonly deps;
    readonly id = "ipns";
    constructor(ipfsSync: Pick<IPFSSync, 'getApiUrl' | 'publishToIPNS' | 'resolveIPNS'>, deps?: IpnsBackendDeps);
    publish({ secretsKey, repoName, env, cid }: DiscoveryPublishParams): Promise<string | null>;
    resolve({ secretsKey, repoName, env }: DiscoveryResolveParams): Promise<DiscoveryResolveResult>;
}
/** Injectable w3name ops (defaults are the real network impls; tests override). */
export interface W3nameBackendDeps {
    deriveKeyInfo: (secretsKey: string, repoName: string, env: string) => IPNSKeyInfo;
    publish: (seed: Buffer, cid: string) => Promise<string>;
    resolve: (seed: Buffer) => Promise<{
        cid: string | null;
        name: string;
    }>;
}
/**
 * Durable discovery via w3name (Storacha). Publishes/resolves a signed IPNS
 * record hosted at name.web3.storage — survives offline nodes, no DHT TTL, no
 * account. Uses the SAME seed-derived IPNS name as the `ipns` backend.
 */
export declare class W3nameDiscoveryBackend implements DiscoveryBackend {
    private readonly deps;
    readonly id = "w3name";
    constructor(deps?: W3nameBackendDeps);
    publish({ secretsKey, repoName, env, cid }: DiscoveryPublishParams): Promise<string | null>;
    resolve({ secretsKey, repoName, env }: DiscoveryResolveParams): Promise<DiscoveryResolveResult>;
}
/**
 * Composes backends in priority order. Publish dual-writes to all (best-effort —
 * a failure in one doesn't block the others). Resolve tries each in order and
 * returns the first hit, so a durable backend wins but a fallback still works.
 */
export declare class CompositeDiscoveryBackend implements DiscoveryBackend {
    private readonly backends;
    readonly id: string;
    constructor(backends: DiscoveryBackend[]);
    publish(params: DiscoveryPublishParams): Promise<string | null>;
    resolve(params: DiscoveryResolveParams): Promise<DiscoveryResolveResult>;
}
/**
 * Select discovery backend(s) from `LSH_DISCOVERY` (comma-separated, priority
 * order; default 'w3name,ipns'). Returns a single backend or a composite.
 * Falls back to IPNS if the setting resolves to nothing valid.
 */
export declare function getDiscoveryBackend(ipfsSync: Pick<IPFSSync, 'getApiUrl' | 'publishToIPNS' | 'resolveIPNS'>): DiscoveryBackend;
