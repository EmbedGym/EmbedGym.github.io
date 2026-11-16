// Replays the string edits of a small Python script an agent ran on its
// sketch (`python3 - <<'EOF' … EOF`): `.replace(a, b)` and `re.sub(p, r, s)`
// with literal arguments, in script order. Anything else that rewrites the
// file is not modelled, and the caller marks that version unreconstructed.

export type PyEditResult = { ok: true; source: string; edits: number } | { ok: false; reason: string };

interface Lit {
  value: string;
  end: number;
}

/** A Python string literal at `i` (after whitespace), or null. */
export function parsePyString(src: string, i: number): Lit | null {
  while (i < src.length && /\s/.test(src[i])) i++;
  let raw = false;
  const prefix = /^[rRbBuU]{0,2}/.exec(src.slice(i, i + 2))![0];
  if (/[fF]/.test(src[i] ?? '')) return null; // f-strings are not literals
  raw = /[rR]/.test(prefix);
  i += prefix.length;
  const q = src[i];
  if (q !== '"' && q !== "'") return null;
  const triple = src.slice(i, i + 3) === q.repeat(3);
  const close = triple ? q.repeat(3) : q;
  i += close.length;
  let out = '';
  while (i < src.length) {
    if (src.startsWith(close, i)) return { value: out, end: i + close.length };
    const c = src[i];
    if (!triple && c === '\n') return null;
    if (c === '\\') {
      const n = src[i + 1];
      if (raw) {
        out += c + n;
        i += 2;
        continue;
      }
      const simple: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '0': '\0', '\n': '' };
      if (n in simple) {
        out += simple[n];
        i += 2;
        continue;
      }
      if (n === 'x') {
        out += String.fromCharCode(parseInt(src.slice(i + 2, i + 4), 16));
        i += 4;
        continue;
      }
      out += c + n; // unknown escapes keep the backslash, as Python does
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return null;
}

/** Python `re` pattern and replacement → JS. Covers the common subset. */
function pyRegex(pattern: string, flags: string): RegExp {
  const p = pattern.replace(/\(\?P<(\w+)>/g, '(?<$1>').replace(/\(\?P=(\w+)\)/g, '\\k<$1>');
  return new RegExp(p, 'g' + flags);
}
function pyReplacement(r: string): string {
  return r
    .replace(/\$/g, '$$$$')
    .replace(/\\g<(\d+)>/g, '$$$1')
    .replace(/\\g<(\w+)>/g, '$$<$1>')
    .replace(/\\(\d)/g, '$$$1');
}

function args(src: string, i: number, n: number): { lits: Lit[]; rest: number } | null {
  const lits: Lit[] = [];
  for (let k = 0; k < n; k++) {
    const lit = parsePyString(src, i);
    if (!lit) return null;
    lits.push(lit);
    i = lit.end;
    while (/\s/.test(src[i] ?? '')) i++;
    if (k < n - 1) {
      if (src[i] !== ',') return null;
      i++;
    }
  }
  return { lits, rest: i };
}

export function applyPyEdits(script: string, source: string): PyEditResult {
  const calls = [...script.matchAll(/\.replace\(|\bre\.sub\(/g)];
  if (!calls.length) return { ok: false, reason: 'no .replace() or re.sub() call' };
  let s = source;
  let edits = 0;
  for (const m of calls) {
    const at = m.index! + m[0].length;
    if (m[0] === '.replace(') {
      const a = args(script, at, 2);
      if (!a) return { ok: false, reason: `non-literal .replace() at ${m.index}` };
      s = s.split(a.lits[0].value).join(a.lits[1].value);
    } else {
      const a = args(script, at, 2);
      if (!a) return { ok: false, reason: `non-literal re.sub() at ${m.index}` };
      // re.sub(p, r, s[, count][, flags=…]): only the flags matter here.
      const tail = script.slice(a.rest, script.indexOf(')', a.rest) + 1);
      let flags = '';
      if (/re\.(S|DOTALL)\b/.test(tail)) flags += 's';
      if (/re\.(M|MULTILINE)\b/.test(tail)) flags += 'm';
      if (/re\.(I|IGNORECASE)\b/.test(tail)) flags += 'i';
      if (/,\s*\d+\s*[,)]/.test(tail)) return { ok: false, reason: 're.sub() with a count' };
      try {
        s = s.replace(pyRegex(a.lits[0].value, flags), pyReplacement(a.lits[1].value));
      } catch (err) {
        return { ok: false, reason: `regex: ${(err as Error).message}` };
      }
    }
    edits++;
  }
  return { ok: true, source: s, edits };
}
