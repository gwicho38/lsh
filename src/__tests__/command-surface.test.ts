import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { REMOVED_COMMANDS, REMOVED_SYNC_SUBCOMMANDS } from '../lib/removed-commands.js';

const CLI = path.join(process.cwd(), 'dist', 'cli.js');
const built = fs.existsSync(CLI);
const describeIfBuilt = built ? describe : describe.skip;

function runCli(args: string[]): { stdout: string; status: number } {
  try {
    return { stdout: execFileSync('node', [CLI, ...args], { encoding: 'utf8' }), status: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: `${e.stdout ?? ''}${e.stderr ?? ''}`, status: e.status ?? 1 };
  }
}

describeIfBuilt('v4 command surface', () => {
  // Requires `npm run build` first; CI builds before `npm test`.

  it('exposes exactly the four commands plus help', () => {
    const { stdout } = runCli(['--help']);
    const commandBlock = stdout.split('Commands:')[1] ?? '';
    const names = commandBlock
      .split('\n')
      .map((l) => l.trim().split(/[\s|[]/)[0])
      .filter(Boolean);
    // `help` is meta, not one of the five functional commands.
    expect(new Set(names)).toEqual(new Set(['help', 'push', 'pull', 'sync', 'edit', 'list']));
  });

  it('never lists a live command as removed', () => {
    const { stdout } = runCli(['--help']);
    const commandBlock = stdout.split('Commands:')[1] ?? '';
    const live = commandBlock
      .split('\n')
      .map((l) => l.trim().split(/[\s|[]/)[0])
      .filter(Boolean);
    for (const removed of Object.keys(REMOVED_COMMANDS)) {
      expect(live).not.toContain(removed);
    }
  });

  it('advertises only flags that actually exist', () => {
    const helpCache = new Map<string, string>();
    const helpFor = (cmd: string): string => {
      if (!helpCache.has(cmd)) helpCache.set(cmd, runCli([cmd, '--help']).stdout);
      return helpCache.get(cmd)!;
    };

    const allGuidance = [...Object.values(REMOVED_COMMANDS), ...Object.values(REMOVED_SYNC_SUBCOMMANDS)];
    for (const guidance of allGuidance) {
      const match = guidance.match(/^lsh (push|pull|sync|edit) (--[a-z-]+)/);
      if (!match) continue;
      const [, command, flag] = match;
      expect(helpFor(command)).toContain(flag);
    }
  });

  it.each([
    ['get', 'lsh edit --get'],
    ['set', 'lsh edit --set'],
    ['load', 'lsh sync --load'],
    ['key', 'lsh sync --key'],
    ['doctor', 'lsh sync --doctor'],
    ['init', 'lsh sync --init'],
    ['clear', 'lsh sync --repair'],
    ['ipfs', 'automatically'],
  ])('tells the user what replaced lsh %s', (removed, guidance) => {
    const { stdout, status } = runCli([removed]);
    expect(status).toBe(1);
    expect(stdout).toContain('was removed in v4.0.0');
    expect(stdout).toContain(guidance);
  });

  it.each([
    ['push', 'lsh push'],
    ['pull', 'lsh pull'],
    ['now', 'lsh sync'],
    ['clear', 'lsh sync --repair'],
    ['start', 'automatically'],
  ])('tells the user what replaced lsh sync %s', (sub, guidance) => {
    const { stdout, status } = runCli(['sync', sub]);
    expect(status).toBe(1);
    expect(stdout).toContain('was removed in v4.0.0');
    expect(stdout).toContain(guidance);
  });

  it('does not mistake a flag for a removed subcommand', () => {
    expect(runCli(['sync', '--help']).status).toBe(0);
  });
});
