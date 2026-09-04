/**
 * Pure .env parsing, serialization, and diffing. No I/O.
 */

export interface EnvDiff {
  added: string[];
  changed: string[];
  removed: string[];
  isEmpty: boolean;
}

export function parseEnv(content: string): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) value = value.slice(1, -1);

    vars[key] = value;
  }

  return vars;
}

function formatEnvLine(key: string, value: string): string {
  return /[\s#"']/.test(value) ? `${key}="${value}"` : `${key}=${value}`;
}

export function serializeEnv(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => formatEnvLine(key, value))
    .join('\n')
    .concat('\n');
}

function lineKey(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  return match ? match[1].trim() : null;
}

/**
 * Applies `updates` to `content` line-by-line: a line whose key is in `updates` is replaced
 * with the new value, every other line (comments, blanks, unrecognized text) is returned
 * byte-identical, and keys not already present are appended. Unlike `serializeEnv`, this
 * never round-trips the file through `parseEnv`, so it can't drop comments or reformat a
 * value `parseEnv` would otherwise strip (e.g. an unquoted trailing `#` comment).
 *
 * A key that appears more than once resolves last-wins, matching `parseEnv` and dotenv — so
 * a duplicated key is updated at its last occurrence and every earlier occurrence is dropped,
 * keeping the file's resolved value in agreement with what was just set.
 */
export function upsertEnv(content: string, updates: Record<string, string>): string {
  const pending = new Set(Object.keys(updates));
  const lines = content.length === 0 ? [] : content.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const lastIndexForKey = new Map<string, number>();
  lines.forEach((line, index) => {
    const key = lineKey(line);
    if (key && pending.has(key)) lastIndexForKey.set(key, index);
  });

  const result = lines
    .map((line, index) => {
      const key = lineKey(line);
      if (!key || !pending.has(key)) return line;
      if (index !== lastIndexForKey.get(key)) return null;

      pending.delete(key);
      return formatEnvLine(key, updates[key]);
    })
    .filter((line): line is string => line !== null);

  for (const key of Object.keys(updates)) {
    if (pending.has(key)) result.push(formatEnvLine(key, updates[key]));
  }

  return result.join('\n').concat('\n');
}

export function diffEnv(
  local: Record<string, string>,
  remote: Record<string, string>,
): EnvDiff {
  const added = Object.keys(local).filter((k) => !(k in remote));
  const changed = Object.keys(local).filter((k) => k in remote && local[k] !== remote[k]);
  const removed = Object.keys(remote).filter((k) => !(k in local));

  return {
    added,
    changed,
    removed,
    isEmpty: added.length === 0 && changed.length === 0 && removed.length === 0,
  };
}
