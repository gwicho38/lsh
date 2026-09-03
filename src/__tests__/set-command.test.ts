import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseAssignments } from '../commands/set.js';

describe('parseAssignments', () => {
  it('parses plain KEY=VALUE lines', () => {
    expect(parseAssignments('A=1\nB=2\n').updates).toEqual({ A: '1', B: '2' });
  });

  // `printenv`, a sourced profile, and `lsh get --format export` all emit the export prefix.
  it('tolerates an export prefix', () => {
    expect(parseAssignments('export A=1\n').updates).toEqual({ A: '1' });
  });

  it('strips matching surrounding quotes', () => {
    expect(parseAssignments('A="two words"\nB=\'x\'\n').updates).toEqual({ A: 'two words', B: 'x' });
  });

  it('skips comments and blank lines without reporting them as errors', () => {
    const { updates, errors } = parseAssignments('# header\n\nA=1\n');
    expect(updates).toEqual({ A: '1' });
    expect(errors).toEqual([]);
  });

  it('reports a line with no assignment instead of dropping it silently', () => {
    const { updates, errors } = parseAssignments('bad line\nA=1\n');
    expect(updates).toEqual({ A: '1' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('bad line');
  });

  // A key that isn't a valid variable name would emit an executable line under
  // `--format export`, so it is refused at the write boundary rather than stored.
  it('refuses a key that is not a valid environment variable name', () => {
    const { updates, errors } = parseAssignments('A;echo INJECTED=1\nGOOD=safe\n');
    expect(updates).toEqual({ GOOD: 'safe' });
    expect(errors[0]).toContain('Invalid key');
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
function runCli(args: string[], cwd: string, home: string, input = ''): CliResult {
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  try {
    return { stdout: execFileSync('node', [CLI, ...args], { encoding: 'utf8', cwd, env, input }), status: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: `${e.stdout ?? ''}${e.stderr ?? ''}`, status: e.status ?? 1 };
  }
}

describeIfBuilt('lsh set', () => {
  let tempHome: string;
  let workDir: string;
  let envFile: string;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-set-home-'));
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-set-work-'));
    envFile = path.join(workDir, '.env');
    fs.writeFileSync(envFile, '# header\nAPI_KEY=old\nOTHER=keep\n');
  });

  afterEach(() => {
    fs.rmSync(tempHome, { recursive: true, force: true });
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('updates one key in place, preserving comments and the other keys', () => {
    const { status } = runCli(['set', 'API_KEY', 'new', '--file', envFile], workDir, tempHome);
    expect(status).toBe(0);
    expect(fs.readFileSync(envFile, 'utf8')).toBe('# header\nAPI_KEY=new\nOTHER=keep\n');
  });

  it('appends a key that is not already present', () => {
    const { status } = runCli(['set', 'ADDED', 'v', '--file', envFile], workDir, tempHome);
    expect(status).toBe(0);
    expect(fs.readFileSync(envFile, 'utf8')).toContain('ADDED=v');
  });

  it('creates the file when it does not exist', () => {
    const fresh = path.join(workDir, '.env.fresh');
    const { status } = runCli(['set', 'A', '1', '--file', fresh], workDir, tempHome);
    expect(status).toBe(0);
    expect(fs.readFileSync(fresh, 'utf8')).toContain('A=1');
  });

  it('batch-upserts KEY=VALUE lines piped on stdin', () => {
    const { status } = runCli(['set', '--file', envFile], workDir, tempHome, 'API_KEY=piped\nNEW=1\n');
    expect(status).toBe(0);
    const written = fs.readFileSync(envFile, 'utf8');
    expect(written).toContain('API_KEY=piped');
    expect(written).toContain('NEW=1');
    expect(written).toContain('OTHER=keep');
  });

  it('exits 1 with usage when the value is missing', () => {
    const { stdout, status } = runCli(['set', 'API_KEY', '--file', envFile], workDir, tempHome);
    expect(status).toBe(1);
    expect(stdout).toContain('Usage: lsh set <key> <value>');
    expect(fs.readFileSync(envFile, 'utf8')).toContain('API_KEY=old');
  });

  it('exits 1 without writing when the key is not a valid variable name', () => {
    const { stdout, status } = runCli(['set', 'A;echo INJECTED', 'x', '--file', envFile], workDir, tempHome);
    expect(status).toBe(1);
    expect(stdout).toContain('Invalid key');
    expect(fs.readFileSync(envFile, 'utf8')).not.toContain('INJECTED');
  });

  it('exits 1 when stdin carries no usable assignment', () => {
    const { stdout, status } = runCli(['set', '--file', envFile], workDir, tempHome, 'garbage\n');
    expect(status).toBe(1);
    expect(stdout).toContain('No valid KEY=VALUE pairs');
  });

  it('backs the file up before overwriting it', () => {
    runCli(['set', 'API_KEY', 'new', '--file', envFile], workDir, tempHome);
    const backups = fs.readdirSync(workDir).filter((name) => name.startsWith('.env.backup.'));
    expect(backups).toHaveLength(1);
    expect(fs.readFileSync(path.join(workDir, backups[0]), 'utf8')).toContain('API_KEY=old');
  });
});
