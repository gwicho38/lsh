import { classifyPayload } from '../commands/pull.js';

describe('classifyPayload', () => {
  it('recognizes a push-produced Secret[] payload', () => {
    const json = JSON.stringify([
      { key: 'A', value: '1', environment: 'dev' },
      { key: 'B', value: 'two words', environment: 'dev' },
    ]);
    const result = classifyPayload(json);
    expect(result.kind).toBe('secrets');
    if (result.kind === 'secrets') expect(result.vars).toEqual({ A: '1', B: 'two words' });
  });

  it('recognizes raw .env text from a v3 sync push', () => {
    const result = classifyPayload('A=1\nB=2\n');
    expect(result.kind).toBe('envtext');
  });

  it('refuses an unrecognized payload rather than guessing', () => {
    expect(classifyPayload('this is not env text and not json').kind).toBe('unknown');
    expect(classifyPayload('{"not":"an array"}').kind).toBe('unknown');
    expect(classifyPayload('[1,2,3]').kind).toBe('unknown');
    expect(classifyPayload('').kind).toBe('unknown');
  });

  it('treats a JSON array of wrong-shaped objects as unknown', () => {
    expect(classifyPayload(JSON.stringify([{ foo: 'bar' }])).kind).toBe('unknown');
  });
});
