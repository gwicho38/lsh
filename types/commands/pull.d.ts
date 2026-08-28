/**
 * lsh pull — fetch and decrypt a .env from cloud storage.
 */
import { Command } from 'commander';
export type PulledPayload = {
    kind: 'secrets';
    vars: Record<string, string>;
} | {
    kind: 'envtext';
    text: string;
} | {
    kind: 'unknown';
};
/**
 * Identify what an explicit `--cid` decrypted to, since the CID may point at either
 * a push-produced `Secret[]` JSON payload or raw .env text from the removed v3 `sync push` subcommand.
 * Never guess: an unrecognized shape must not be written to the user's .env.
 */
export declare function classifyPayload(decrypted: string): PulledPayload;
/**
 * Ported from the removed v3 `sync pull` subcommand; kept as its own branch because
 * `SecretsManager.pull` has no CID/IPNS-resolution path.
 */
export declare function pullByCidOrRepo(filePath: string, environment: string, cidOption: string | undefined, repoOption: string | undefined, force: boolean): Promise<void>;
export declare function registerPullCommand(program: Command): void;
