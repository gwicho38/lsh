/**
 * Persistent storage for the LSH sync secret.
 *
 * Mirrors the design of mcli's `mcli sync key` store: a single 64-char
 * hex value kept in ``$LSH_HOME/sync_key.json`` (default
 * ``~/.config/lsh/sync_key.json``) with mode 0600. The
 * ``LSH_SECRETS_KEY`` environment variable still wins when set; the
 * store is only consulted as a fallback so users do not have to re-paste
 * their secret on every shell.
 */
export declare const HEX64_REGEX: RegExp;
/** Resolve the directory where lsh stores its config (`$LSH_HOME` or `~/.config/lsh`). */
export declare function getLshHome(): string;
/** Return a freshly-generated 64-char hex secret without persisting it. */
export declare function generateKey(): string;
/**
 * Persistent on-disk store for the LSH sync secret.
 */
export declare class SyncKeyStore {
    /** Absolute path to the on-disk key file. */
    get path(): string;
    /** Read the persisted key, or `null` if none is configured / file is malformed. */
    get(): string | null;
    /** Validate and persist a key. Throws on invalid input. */
    set(key: string): void;
    /** Generate a new key and persist it. Refuses to overwrite unless `force=true`. */
    generate(force?: boolean): string;
    /** Delete the persisted key, if any. No-op when the file is absent. */
    clear(): void;
    private write;
}
