/**
 * Regression tests for `lsh self update` build-status evaluation.
 *
 * Bug: checkCIStatus queried the most recent completed run of ANY workflow, so a
 * flaky security scan (e.g. Codacy timing out downloading codeql-action) made
 * `lsh self update` report "build failing" even though the build was fine. Fix
 * scopes the query to node.js.yml and treats only a real `failure` as blocking.
 */
import { describe, it, expect } from '@jest/globals';
import { evaluateBuildRuns } from '../src/commands/self.js';

const run = (status: string, conclusion: string | null, url = 'https://x/1') => ({
  head_branch: 'main',
  status,
  conclusion,
  html_url: url,
} as any);

describe('evaluateBuildRuns', () => {
  it('blocks only on a real failure of the latest completed run', () => {
    const r = evaluateBuildRuns([run('completed', 'failure', 'https://x/fail')]);
    expect(r.passing).toBe(false);
    expect(r.url).toBe('https://x/fail');
  });

  it('treats cancelled as passing (concurrency cancels are infra noise, not a failing build)', () => {
    expect(evaluateBuildRuns([run('completed', 'cancelled')]).passing).toBe(true);
  });

  it('treats success as passing', () => {
    expect(evaluateBuildRuns([run('completed', 'success')]).passing).toBe(true);
  });

  it('treats skipped / null conclusion as passing', () => {
    expect(evaluateBuildRuns([run('completed', 'skipped')]).passing).toBe(true);
    expect(evaluateBuildRuns([run('completed', null)]).passing).toBe(true);
  });

  it('ignores in-progress/queued runs and uses the most recent completed one', () => {
    const runs = [
      run('in_progress', null, 'https://x/running'),
      run('completed', 'failure', 'https://x/fail'),
    ];
    const r = evaluateBuildRuns(runs);
    expect(r.passing).toBe(false);
    expect(r.url).toBe('https://x/fail');
  });

  it('does not block when there are no completed runs', () => {
    expect(evaluateBuildRuns([run('queued', null)]).passing).toBe(true);
    expect(evaluateBuildRuns([]).passing).toBe(true);
  });
});
