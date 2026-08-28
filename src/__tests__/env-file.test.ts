import { parseEnv, serializeEnv, upsertEnv, diffEnv } from '../lib/env-file.js';

describe('parseEnv', () => {
  it('parses KEY=VALUE lines', () => {
    expect(parseEnv('A=1\nB=2')).toEqual({ A: '1', B: '2' });
  });

  it('skips comments and blank lines', () => {
    expect(parseEnv('# note\n\nA=1\n   \n')).toEqual({ A: '1' });
  });

  it('strips matched surrounding quotes', () => {
    expect(parseEnv('A="one"\nB=\'two\'')).toEqual({ A: 'one', B: 'two' });
  });

  it('keeps equals signs inside the value', () => {
    expect(parseEnv('URL=postgres://u:p@h/db?a=b')).toEqual({
      URL: 'postgres://u:p@h/db?a=b',
    });
  });

  it('keeps an empty value', () => {
    expect(parseEnv('A=')).toEqual({ A: '' });
  });

  it('ignores a line with no equals sign', () => {
    expect(parseEnv('garbage\nA=1')).toEqual({ A: '1' });
  });
});

describe('serializeEnv', () => {
  it('round-trips through parseEnv', () => {
    const vars = { A: '1', URL: 'postgres://u:p@h/db?a=b', EMPTY: '' };
    expect(parseEnv(serializeEnv(vars))).toEqual(vars);
  });

  it('quotes values containing spaces', () => {
    expect(serializeEnv({ A: 'two words' })).toBe('A="two words"\n');
  });

  it('does not quote simple values', () => {
    expect(serializeEnv({ A: '1' })).toBe('A=1\n');
  });

  it('round-trips a value that is itself quote-wrapped', () => {
    expect(parseEnv(serializeEnv({ K: '"abc"' })).K).toBe('"abc"');
    expect(parseEnv(serializeEnv({ K: "'abc'" })).K).toBe("'abc'");
  });

  it('round-trips a value containing a hash', () => {
    expect(parseEnv(serializeEnv({ K: 'a#b' })).K).toBe('a#b');
  });

  it('quotes values containing a quote character', () => {
    expect(serializeEnv({ K: '"abc"' })).toBe('K=""abc""\n');
  });
});

describe('upsertEnv', () => {
  const BEFORE = [
    '# Production database credentials',
    '# Owner: platform-team',
    '',
    'DB_HOST=db.internal',
    'DB_PASS=p@ss # rotated 2026-01-04',
    '# TODO: move STRIPE_KEY to prod vault',
    'STRIPE_KEY=fixture-stripe-key',
    '',
  ].join('\n');

  it('preserves comments, blank lines, and an untouched inline-# value verbatim', () => {
    const after = upsertEnv(BEFORE, { NEW_KEY: '1' });
    expect(after).toBe(
      [
        '# Production database credentials',
        '# Owner: platform-team',
        '',
        'DB_HOST=db.internal',
        'DB_PASS=p@ss # rotated 2026-01-04',
        '# TODO: move STRIPE_KEY to prod vault',
        'STRIPE_KEY=fixture-stripe-key',
        'NEW_KEY=1',
        '',
      ].join('\n'),
    );
  });

  it('replaces the value in place on an existing key, leaving other lines untouched', () => {
    const after = upsertEnv('# note\nEXISTING=old\nOTHER=1\n', { EXISTING: 'new' });
    expect(after).toBe('# note\nEXISTING=new\nOTHER=1\n');
  });

  it('appends keys that are not already present', () => {
    expect(upsertEnv('A=1\n', { B: '2' })).toBe('A=1\nB=2\n');
  });

  it('quotes an appended value containing spaces', () => {
    expect(upsertEnv('A=1\n', { MESSAGE: 'hello world' })).toBe('A=1\nMESSAGE="hello world"\n');
  });

  it('starts fresh on empty content', () => {
    expect(upsertEnv('', { A: '1' })).toBe('A=1\n');
  });

  it('merges several incoming keys at once, as a --copy-from merge would', () => {
    const before = '# local overrides\nLOCAL_ONLY=keep-me\nAPI_KEY=old\n';
    const after = upsertEnv(before, { API_KEY: 'new', EXTRA: 'added' });
    expect(after).toBe('# local overrides\nLOCAL_ONLY=keep-me\nAPI_KEY=new\nEXTRA=added\n');
  });

  it('updates the last occurrence of a duplicated key and drops the earlier duplicate, last-wins like parseEnv', () => {
    const before = 'API_KEY=old1\nOTHER=x\nAPI_KEY=old2\n';
    const after = upsertEnv(before, { API_KEY: 'NEWVAL' });
    expect(after).toBe('OTHER=x\nAPI_KEY=NEWVAL\n');
    expect(parseEnv(after)).toEqual({ OTHER: 'x', API_KEY: 'NEWVAL' });
  });

  it('resolves the set-then-get invariant: parseEnv on the result matches what was requested', () => {
    const before = 'API_KEY=old1\nOTHER=x\nAPI_KEY=old2\nAPI_KEY=old3\n';
    const after = upsertEnv(before, { API_KEY: 'FINAL' });
    expect(parseEnv(after).API_KEY).toBe('FINAL');
  });

  it('does not treat a commented-out duplicate as a match', () => {
    const before = '# API_KEY=commented-old\nAPI_KEY=real-old\n';
    const after = upsertEnv(before, { API_KEY: 'NEWVAL' });
    expect(after).toBe('# API_KEY=commented-old\nAPI_KEY=NEWVAL\n');
  });

  it('does not match a key that is a prefix of another key', () => {
    const before = 'DB_HOSTNAME=keep-me\n';
    const after = upsertEnv(before, { DB_HOST: 'new' });
    expect(after).toBe('DB_HOSTNAME=keep-me\nDB_HOST=new\n');
  });
});

describe('diffEnv', () => {
  it('reports an empty diff for identical records', () => {
    const d = diffEnv({ A: '1' }, { A: '1' });
    expect(d.isEmpty).toBe(true);
    expect(d.added).toEqual([]);
    expect(d.changed).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it('reports keys present locally but not remotely as added', () => {
    expect(diffEnv({ A: '1', B: '2' }, { A: '1' }).added).toEqual(['B']);
  });

  it('reports keys with different values as changed', () => {
    expect(diffEnv({ A: '9' }, { A: '1' }).changed).toEqual(['A']);
  });

  it('reports keys present remotely but not locally as removed', () => {
    expect(diffEnv({ A: '1' }, { A: '1', C: '3' }).removed).toEqual(['C']);
  });

  it('is not empty when anything differs', () => {
    expect(diffEnv({ A: '1' }, {}).isEmpty).toBe(false);
  });
});
