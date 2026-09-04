/**
 * Resolves CLI flags into the workspace context every command needs.
 */
import SecretsManager from './secrets-manager.js';
export interface ContextFlags {
    file?: string;
    env?: string;
    global?: boolean;
}
export interface WorkspaceContext {
    manager: SecretsManager;
    filePath: string;
    environment: string;
}
/**
 * An unset or still-default `-e` means "use the git-derived environment",
 * which is why the literal string 'dev' is treated as absent.
 */
export declare function resolveEnvironment(manager: SecretsManager, envFlag: string | undefined): string;
export declare function resolveContext(flags: ContextFlags): WorkspaceContext;
