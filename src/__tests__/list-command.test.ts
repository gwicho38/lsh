import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CLI = path.join(process.cwd(), 'dist', 'cli.js');
const built = fs.existsSync(CLI);
const describeIfBuilt = built ? describe : describe.skip;

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

describeIfBuilt('lsh list', () => {
  let tempHome: string;
  let workDir: string;
  let envFile: string;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-list-home-'));
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-list-work-'));
    envFile = path.join(workDir, '.env');
    fs.writeFileSync(envFile, 'API_KEY=fixture-api-key-abcdef\nPLAIN=short\n');
  });

  afterEach(() => {
    fs.rmSync(tempHome, { recursive: true, force: true });
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('masks values by default', () => {
    const { stdout, status } = runCli(['list', '--file', envFile], workDir, tempHome);
    expect(status).toBe(0);
    expect(stdout).not.toContain('fixture-api-key-abcdef');
    expect(stdout).toContain('API_KEY');
  });

  it('--no-mask shows real values', () => {
    const { stdout, status } = runCli(['list', '--file', envFile, '--no-mask'], workDir, tempHome);
    expect(status).toBe(0);
    expect(stdout).toContain('fixture-api-key-abcdef');
    expect(stdout).toContain('PLAIN=short');
  });

  it('--keys-only prints only key names', () => {
    const { stdout, status } = runCli(['list', '--file', envFile, '--keys-only'], workDir, tempHome);
    expect(status).toBe(0);
    const lines = stdout.trim().split('\n');
    expect(lines).toEqual(['API_KEY', 'PLAIN']);
    expect(stdout).not.toContain('fixture-api-key-abcdef');
  });

  it('the ls alias behaves identically to list', () => {
    const { stdout, status } = runCli(['ls', '--file', envFile, '--no-mask'], workDir, tempHome);
    expect(status).toBe(0);
    expect(stdout).toContain('fixture-api-key-abcdef');
  });

  it.each([
    ['env', (out: string) => expect(out).toContain('API_KEY=fixture-api-key-abcdef')],
    ['json', (out: string) => expect(JSON.parse(out)).toEqual({ API_KEY: 'fixture-api-key-abcdef', PLAIN: 'short' })],
    ['yaml', (out: string) => expect(out).toContain('API_KEY:')],
    ['toml', (out: string) => expect(out).toContain('API_KEY = "fixture-api-key-abcdef"')],
    ['export', (out: string) => expect(out).toContain("export API_KEY='fixture-api-key-abcdef'")],
  ])('--format %s produces the expected shape', (format, assertShape) => {
    const { stdout, status } = runCli(['list', '--file', envFile, '--format', format, '--no-mask'], workDir, tempHome);
    expect(status).toBe(0);
    assertShape(stdout);
  });

  // Masking is per-format by default: the human-browsing `env` format masks, the
  // machine-consumption formats (json/yaml/toml/export) do not — a masked value silently
  // corrupts anything that evals or parses the output, which is worse than refusing.
  it.each([
    ['env', true],
    ['json', false],
    ['yaml', false],
    ['toml', false],
    ['export', false],
  ])('--format %s masks by default: %s', (format, masked) => {
    const { stdout, status } = runCli(['list', '--file', envFile, '--format', format], workDir, tempHome);
    expect(status).toBe(0);
    if (masked) {
      expect(stdout).not.toContain('fixture-api-key-abcdef');
      expect(stdout).toContain('***');
    } else {
      expect(stdout).toContain('fixture-api-key-abcdef');
      expect(stdout).not.toContain('***');
    }
  });

  it('--format export emits a real value an eval could consume, not a masked one', () => {
    const { stdout, status } = runCli(['list', '--file', envFile, '--format', 'export'], workDir, tempHome);
    expect(status).toBe(0);
    expect(stdout).toContain("export API_KEY='fixture-api-key-abcdef'");
    expect(stdout).not.toContain('***');
  });

  it('--format json emits a real value a JSON parser could consume, not a masked one', () => {
    const { stdout, status } = runCli(['list', '--file', envFile, '--format', 'json'], workDir, tempHome);
    expect(status).toBe(0);
    expect(JSON.parse(stdout)).toEqual({ API_KEY: 'fixture-api-key-abcdef', PLAIN: 'short' });
  });

  it('--format json --no-mask is a no-op — already unmasked, as in v3', () => {
    const { stdout, status } = runCli(['list', '--file', envFile, '--format', 'json', '--no-mask'], workDir, tempHome);
    expect(status).toBe(0);
    expect(JSON.parse(stdout)).toEqual({ API_KEY: 'fixture-api-key-abcdef', PLAIN: 'short' });
  });

  it('rejects an unknown format instead of silently coercing it', () => {
    const { stdout, status } = runCli(['list', '--file', envFile, '--format', 'table'], workDir, tempHome);
    expect(status).toBe(1);
    expect(stdout).toContain("Unknown format 'table'");
    expect(stdout).toContain('env, json, yaml, toml, export');
  });

  it('exits 1 and names the resolved path when the file is missing', () => {
    const missing = path.join(workDir, 'nope.env');
    const { stdout, status } = runCli(['list', '--file', missing], workDir, tempHome);
    expect(status).toBe(1);
    expect(stdout).toContain(missing);
    expect(fs.existsSync(missing)).toBe(false);
  });

  it('--format export refuses a key that would inject a shell command', () => {
    const maliciousFile = path.join(workDir, 'malicious.env');
    fs.writeFileSync(maliciousFile, 'A;echo INJECTED=1\nGOOD=safe\n');

    const { stdout, status } = runCli(['list', '--file', maliciousFile, '--format', 'export', '--no-mask'], workDir, tempHome);

    expect(status).toBe(1);
    expect(stdout).toContain('Invalid environment variable name');
    expect(stdout).not.toContain('export A;echo');
    expect(stdout).not.toMatch(/^export /m);
  });
});
