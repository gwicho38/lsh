/**
 * lsh edit — edit the local .env, then optionally publish the change.
 */
import { Command } from 'commander';
import { type EnvDiff } from '../lib/env-file.js';
import { type OutputFormat, type SecretEntry } from '../lib/format-utils.js';
export declare function shouldPrompt(): boolean;
export declare function openInEditor(filePath: string): Promise<void>;
export declare function normalizeFormat(format: string): OutputFormat;
export declare function parseSetAssignment(assignment: string): {
    key: string;
    value: string;
} | null;
/**
 * SecretsManager.pull requires the basename to be `.env` or start with `.env.`; naming the
 * temp file this way (regardless of the target's own basename) always satisfies that guard.
 */
export declare function copyFromTempPath(filePath: string): string;
export declare function toEntries(vars: Record<string, string>): SecretEntry[];
export type ReadOnlyResult = {
    kind: 'ok';
    output: string;
} | {
    kind: 'not-found';
    key: string;
};
/**
 * `--list` always masks; `--get` never masks, because the user explicitly asked for values.
 */
export declare function resolveGetOrList(vars: Record<string, string>, options: {
    get?: string | boolean;
    all?: boolean;
    list?: boolean;
    format: OutputFormat;
}): ReadOnlyResult;
export declare function formatEditSummary(diff: EnvDiff): string;
/**
 * Interprets a raw confirm() answer against a "[Y/n]" prompt. Empty, `y`, and `yes` proceed;
 * everything else — including `n`, `no`, and unrecognized input — cancels, since an IPFS
 * publish can't be retracted and the safe default is not to publish.
 */
export declare function parseConfirmAnswer(answer: string): boolean;
export declare function registerEditCommand(program: Command): void;
