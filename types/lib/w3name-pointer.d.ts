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
/**
 * Publish `cid` under the seed-derived w3name pointer. Returns the IPNS name.
 * Handles IPNS sequencing: increments from the current revision if one exists,
 * else publishes v0.
 */
export declare function w3namePublish(seed: Buffer, cid: string): Promise<string>;
/** Resolve the latest CID for the seed-derived w3name pointer. */
export declare function w3nameResolve(seed: Buffer): Promise<{
    cid: string | null;
    name: string;
}>;
