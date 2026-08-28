/**
 * lsh sync — reconcile local and remote secrets, and report sync/IPFS state.
 * Also carries the operational control plane: setup, keys, config, and health.
 */
import { Command } from 'commander';
export interface SyncStatus {
    localExists: boolean;
    localKeys: number;
    cloudExists: boolean;
    cloudKeys: number;
    keySet: boolean;
    keyMatches?: boolean;
    suggestions: string[];
}
interface SmartSyncCapable {
    smartSync: (filePath: string, environment: string, autoExecute: boolean, loadMode: boolean, force: boolean) => Promise<void>;
}
export declare function isExportLine(value: unknown): value is string;
export declare function withFilteredStdout<T>(shouldPrint: (value: unknown) => boolean, fn: () => Promise<T>): Promise<T>;
export declare function runSmartSync(manager: SmartSyncCapable, filePath: string, environment: string, loadMode: boolean, force: boolean): Promise<void>;
export declare function printStatus(status: SyncStatus, environment: string, daemonReachable: boolean): void;
/**
 * Reads LSH_SECRETS_KEY directly out of a specific .env file, tolerating
 * optional surrounding quotes. Mirrors secrets-manager.ts's private
 * readKeyFromEnvFile so the two behave identically on quoted values.
 */
export declare function readKeyFrom(envPath: string): string | null;
/**
 * Import an encryption key into a local .env file. Replacing an existing, different key
 * makes secrets already pushed with the old key permanently undecryptable, so that path
 * is refused unless `force` is set. Two independent risks are guarded:
 *   - the file about to be written already holds a different key (an overwrite), and
 *   - a non-global write would take priority over a different key that is currently
 *     effective from the lower-priority global ~/.env (a silent shadow).
 * A global write is already the lowest-priority tier, so it can never shadow anything —
 * checking it against `findEncryptionKeyWithSource()` there would refuse based on a key
 * (e.g. an env var) that the write can't actually affect.
 */
export declare function importKey(value: string, force: boolean, global: boolean, file: string): void;
export declare function maskConfigValue(key: string, value: string): string;
/** Prints the resolved LSH configuration (~/.config/lsh/lshrc) and its path. */
export declare function printConfig(format: string): Promise<void>;
/**
 * Prints recent local sync activity plus the immutable IPFS sync record log.
 * `getAllRecords` drops any log entry whose backing record file can't be
 * read; that omission is surfaced via `unreadableRecords` rather than
 * silently shrinking the list, since a clean-looking audit trail that hides
 * gaps is the wrong failure mode for a secrets manager.
 */
export declare function printHistory(environment: string, format: string): Promise<void>;
/** Clears local sync metadata and cache so a stuck registry can start clean. */
export declare function runRepair(): Promise<void>;
/** Checks whether a CID is retrievable from the local daemon or public gateways. */
export declare function runVerify(cid: string): Promise<void>;
export declare function registerSyncCommand(program: Command): void;
export {};
