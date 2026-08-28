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
export function resolveEnvironment(
  manager: SecretsManager,
  envFlag: string | undefined,
): string {
  if (!envFlag || envFlag === 'dev') {
    return manager.getDefaultEnvironment();
  }
  return envFlag;
}

export function resolveContext(flags: ContextFlags): WorkspaceContext {
  const manager = new SecretsManager({ globalMode: flags.global });
  return {
    manager,
    filePath: manager.resolveFilePath(flags.file ?? '.env'),
    environment: resolveEnvironment(manager, flags.env),
  };
}
