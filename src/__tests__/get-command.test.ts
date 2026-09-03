import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveGet, formatAmbiguousMatches, normalizeFormat } from '../commands/get.js';

const VARS = { API_KEY: 'fixture-api-key-abcdef', STRIPE_API_KEY: 'stripe_secret_1', PLAIN: 'short' };

describe('resolveGet', () => {
  it('returns the exact value when the key is present', () => {
    expect(resolveGet(VARS, { key: 'API_KEY', format: 'env' })).toEqual({ kind: 'value', value: VARS.API_KEY });
  });

  // An exact hit must never be outranked by a fuzzy neighbour, or a script naming a real key
  // silently receives a different secret.
  it('prefers the exact key over a higher-scoring fuzzy neighbour', () => {
    const vars = { KEY: 'exact-one', API_KEY: 'other-one' };
    expect(resolveGet(vars, { key: 'KEY', format: 'env' })).toEqual({ kind: 'value', value: 'exact-one' });
  });

  it('resolves a space-separated fuzzy search to the single best key', () => {
    expect(resolveGet(VARS, { key: 'stripe api', format: 'env' })).toEqual({
      kind: 'value',
      value: VARS.STRIPE_API_KEY,
    });
  });

  it('reports an ambiguous search rather than guessing between equal candidates', () => {
    const result = resolveGet(VARS, { key: 'KEY', format: 'env' });
    expect(result.kind).toBe('ambiguous');
    if (result.kind !== 'ambiguous') return;
    expect(result.matches.map((m) => m.key).sort()).toEqual(['API_KEY', 'STRIPE_API_KEY']);
  });

  it('--exact refuses to fuzzy-match a missing key', () => {
    expect(resolveGet(VARS, { key: 'api', exact: true, format: 'env' })).toEqual({
      kind: 'not-found',
      key: 'api',
      exact: true,
    });
  });

  it('reports not-found when nothing matches even fuzzily', () => {
    expect(resolveGet(VARS, { key: 'zzzz', format: 'env' })).toEqual({
      kind: 'not-found',
      key: 'zzzz',
      exact: false,
    });
  });

  it('requires a key when --all is absent', () => {
    expect(resolveGet(VARS, { format: 'env' })).toEqual({ kind: 'key-required' });
  });

  // --all is an explicit request for values; masking here would corrupt the output.
  it('--all emits every value unmasked', () => {
    const result = resolveGet(VARS, { all: true, format: 'json' });
    expect(result.kind).toBe('formatted');
    if (result.kind !== 'formatted') return;
    expect(JSON.parse(result.output)).toEqual(VARS);
  });
});

describe('formatAmbiguousMatches', () => {
  const matches = [{ key: 'API_KEY', value: 'fixture-api-key-abcdef', score: 800 }];

  it('masks candidate values by default', () => {
    expect(formatAmbiguousMatches(matches, true)).not.toContain('fixture-api-key-abcdef');
  });

  it('shows full values when masking is off', () => {
    expect(formatAmbiguousMatches(matches, false)).toContain('fixture-api-key-abcdef');
  });
});

describe('normalizeFormat', () => {
  it('rejects an unknown format instead of coercing it', () => {
    expect(() => normalizeFormat('table')).toThrow(/table/);
  });
});

const CLI = path.join(process.cwd(), 'dist', 'cli.js');
const describeIfBuilt = fs.existsSync(CLI) ? describe : describe.skip;

interface CliResult {
  stdout: string;
  status: number;
}

/**
 * Every invocation runs with HOME/USERPROFILE redirected to a throwaway temp dir, so it can
 * never read or write the real encryption key material at ~/.env or ~/.config/lsh/lshrc.
 */
function runCli(args: string[], cwd: string, home: string): CliResult {
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  try {
    return { stdout: execFileSync('node', [CLI, ...args], { encoding: 'utf8', cwd, env }), status: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: `${e.stdout ?? ''}${e.stderr ?? ''}`, status: e.status ?? 1 };
  }
}

describeIfBuilt('lsh get', () => {
  let tempHome: string;
  let workDir: string;
  let envFile: string;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-get-home-'));
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-get-work-'));
    envFile = path.join(workDir, '.env');
    fs.writeFileSync(envFile, 'API_KEY=fixture-api-key-abcdef\nSTRIPE_API_KEY=stripe_secret_1\n');
  });

  afterEach(() => {
    fs.rmSync(tempHome, { recursive: true, force: true });
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('prints a single value with nothing else on stdout', () => {
    const { stdout, status } = runCli(['get', 'API_KEY', '--file', envFile], workDir, tempHome);
    expect(status).toBe(0);
    expect(stdout.trim()).toBe('fixture-api-key-abcdef');
  });

  it('exits 1 and lists the candidates for an ambiguous key', () => {
    const { stdout, status } = runCli(['get', 'KEY', '--file', envFile], workDir, tempHome);
    expect(status).toBe(1);
    expect(stdout).toContain('API_KEY');
    expect(stdout).toContain('STRIPE_API_KEY');
    expect(stdout).not.toContain('fixture-api-key-abcdef');
  });

  it('--export is shorthand for --format export', () => {
    const { stdout, status } = runCli(['get', '--all', '--export', '--file', envFile], workDir, tempHome);
    expect(status).toBe(0);
    expect(stdout).toContain("export API_KEY='fixture-api-key-abcdef'");
  });

  it('exits 1 and names the resolved path when the file is missing', () => {
    const missing = path.join(workDir, 'nope.env');
    const { stdout, status } = runCli(['get', 'API_KEY', '--file', missing], workDir, tempHome);
    expect(status).toBe(1);
    expect(stdout).toContain(missing);
  });
});
