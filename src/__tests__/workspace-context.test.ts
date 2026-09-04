import { resolveEnvironment } from '../lib/workspace-context.js';

// resolveEnvironment only needs two methods, so a hand-rolled stub is
// clearer here than a jest mock of the whole SecretsManager class.
function stubManager(defaultEnv: string) {
  return { getDefaultEnvironment: () => defaultEnv } as never;
}

describe('resolveEnvironment', () => {
  it('uses the manager default when the flag is absent', () => {
    expect(resolveEnvironment(stubManager('myrepo'), undefined)).toBe('myrepo');
  });

  it('uses the manager default when the flag is the literal "dev" default', () => {
    expect(resolveEnvironment(stubManager('myrepo'), 'dev')).toBe('myrepo');
  });

  it('uses the manager default when the flag is an empty string', () => {
    expect(resolveEnvironment(stubManager('myrepo'), '')).toBe('myrepo');
  });

  it('honors an explicit non-default environment', () => {
    expect(resolveEnvironment(stubManager('myrepo'), 'prod')).toBe('prod');
  });

  it('honors an explicit "staging"', () => {
    expect(resolveEnvironment(stubManager('myrepo'), 'staging')).toBe('staging');
  });
});
