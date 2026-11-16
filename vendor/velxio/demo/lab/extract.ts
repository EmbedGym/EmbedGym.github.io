// A mini-swe-agent trajectory → the Lab view's ordered steps: sketch
// versions written, compiles, simulator runs, library calls and the submit.
//
// Built as a reducer so a live run can feed it one message at a time:
// `const run = newRun(); for (const m of messages) ingest(run, m);`
// `extractRun(traj)` does that for a finished trajectory. Pure: no I/O, so
// node (the vite server), vitest and the page can all import it.

import { applyPyEdits } from './pyedit';

export interface SimLine {
  t: number;
  kind: 'serial' | 'action' | 'end';
  text: string;
  /** Action lines: `read` carries the JSON value the part returned. */
  value?: string;
}

interface StepBase {
  /** Stable within a run: message index + position in that message. */
  id: string;
  msgIndex: number;
  /** Seconds since the first assistant message, when the trajectory has timestamps. */
  at: number | null;
  /** The assistant's text for the message that issued this step, trimmed. */
  thought: string;
}

export interface WriteStep extends StepBase {
  kind: 'write';
  version: number;
  method: 'heredoc' | 'python' | 'sed' | 'unknown';
  /** False when the edit could not be replayed: the version's source is unknown. */
  reconstructed: boolean;
  note?: string;
}
export interface CompileStep extends StepBase {
  kind: 'compile';
  version: number | null;
  ok: boolean;
  excerpt: string;
}
export interface SimulateStep extends StepBase {
  kind: 'simulate';
  /** The sketch version whose hex /solution/solution.hex held. */
  version: number | null;
  runMs: number;
  /** The action script as the agent wrote it; null for a run without one. */
  actions: string | null;
  /** True when `actions` was rebuilt from the output's echoed action lines. */
  actionsFromOutput: boolean;
  /** vlx-run's reply body (everything after its banner line). */
  output: string;
  lines: SimLine[];
  errors: string[];
  ok: boolean;
}
export interface LibStep extends StepBase {
  kind: 'lib';
  op: 'search' | 'install' | 'list';
  query: string;
}
export interface SubmitStep extends StepBase {
  kind: 'submit';
}
/** A message the visitor sent after the run ended (a live run's follow-up). */
export interface UserStep extends StepBase {
  kind: 'user';
  text: string;
}
export type Step = WriteStep | CompileStep | SimulateStep | LibStep | SubmitStep | UserStep;

export interface Version {
  n: number;
  /** Null when the write could not be reconstructed. */
  source: string | null;
  stepId: string;
}

export interface Run {
  steps: Step[];
  versions: Version[];
  /** Internal cursor state; part of the run so ingest() can resume. */
  cursor: { source: string | null; compiled: number | null; hex: number | null; t0: number | null; msgs: number };
}

interface Message {
  role: string;
  content?: unknown;
  reasoning_content?: string | null;
  tool_calls?: Array<{ function: { arguments: string } }> | null;
  extra?: { timestamp?: number; follow_up?: boolean } | null;
}

export function newRun(): Run {
  return { steps: [], versions: [], cursor: { source: null, compiled: null, hex: null, t0: null, msgs: 0 } };
}

const BANNER = '=== vlx-run: simulator output ===';
/** The agent's sketch: an .ino under /solution, not a build output. */
const SKETCH_FILE = /^\/solution\/(?!build\/)(?:[\w.-]+\/)*[\w.-]+\.ino$/;

function resolvePath(cwd: string, p: string): string {
  const parts = (p.startsWith('/') ? p : `${cwd}/${p}`).split('/');
  const out: string[] = [];
  for (const x of parts) {
    if (x === '..') out.pop();
    else if (x && x !== '.') out.push(x);
  }
  return `/${out.join('/')}`;
}

/** The working directory at `pos`: the last `cd` before it (the agent starts in /solution). */
function cwdAt(cmd: string, pos: number): string {
  let cwd = '/solution';
  for (const m of cmd.slice(0, pos).matchAll(/(?:^|[;&|\n(]\s*)cd\s+([^\s;&|)]+)/g)) cwd = resolvePath(cwd, m[1].replace(/^["']|["']$/g, ''));
  return cwd;
}

function text(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'object' && c && 'text' in c ? String(c.text) : '')).join('');
  return '';
}

export function trimThought(m: Message): string {
  let t = text(m.content).trim();
  if (!t && m.reasoning_content) t = m.reasoning_content.trim();
  t = t.replace(/^\*{0,2}THOUGHT:?\*{0,2}:?\s*/i, '');
  return t.length > 1200 ? `${t.slice(0, 1200).trimEnd()}…` : t;
}

function commandsOf(m: Message): string[] {
  const out: string[] = [];
  for (const tc of m.tool_calls ?? []) {
    try {
      const cmd = JSON.parse(tc.function.arguments)?.command;
      if (typeof cmd === 'string') out.push(cmd);
    } catch {
      // malformed arguments carry no command
    }
  }
  // Older text-format trajectories put the command in a ```bash block.
  if (!out.length) {
    const block = /```(?:bash|sh)?\n([\s\S]*?)```/.exec(text(m.content));
    if (block) out.push(block[1]);
  }
  return out;
}

/** <output> of a tool message, and its return code. */
function observation(m: Message | undefined): { code: number | null; body: string } {
  const t = text(m?.content);
  const code = /<returncode>(-?\d+)<\/returncode>/.exec(t);
  const body = /<output>\n?([\s\S]*?)<\/output>/.exec(t)?.[1]
    ?? [/<output_head>\n?([\s\S]*?)<\/output_head>/.exec(t)?.[1], /<output_tail>\n?([\s\S]*?)<\/output_tail>/.exec(t)?.[1]]
      .filter(Boolean)
      .join('\n…\n')
    ?? t;
  return { code: code ? Number(code[1]) : null, body: body || t };
}

interface Heredoc {
  start: number;
  end: number;
  /** The command line that opens the heredoc. */
  head: string;
  body: string;
}

/** Every `<<'EOF' … EOF` in a command, with the line that opens it. */
function heredocs(cmd: string): Heredoc[] {
  const out: Heredoc[] = [];
  const re = /<<-?\s*(['"]?)(\w+)\1[^\n]*\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cmd))) {
    const lineStart = cmd.lastIndexOf('\n', m.index) + 1;
    const bodyStart = m.index + m[0].length;
    const term = new RegExp(`^${m[2]}[ \\t]*$`, 'm');
    const rest = cmd.slice(bodyStart);
    const t = term.exec(rest);
    const bodyEnd = t ? bodyStart + t.index : cmd.length;
    const end = t ? bodyStart + t.index + t[0].length : cmd.length;
    out.push({ start: lineStart, end, head: cmd.slice(lineStart, m.index), body: cmd.slice(bodyStart, bodyEnd).replace(/\n$/, '') });
    re.lastIndex = end;
  }
  return out;
}

type Op =
  | { pos: number; kind: 'write'; method: WriteStep['method']; body?: string; script?: string; sed?: string }
  | { pos: number; kind: 'compile' }
  | { pos: number; kind: 'cp'; foreign: boolean }
  | { pos: number; kind: 'vlx'; ms: number; actions: string | null }
  | { pos: number; kind: 'lib'; op: LibStep['op']; query: string }
  | { pos: number; kind: 'submit' };

/** The operations a command performs that matter here, in command order. */
function parseCommand(cmd: string): Op[] {
  const ops: Op[] = [];
  const docs = heredocs(cmd);
  // Heredoc bodies are data: blank them so their text is not scanned as commands.
  let masked = cmd;
  for (const d of docs) {
    const bodyAt = cmd.indexOf('\n', d.start + d.head.length) + 1;
    masked = masked.slice(0, bodyAt) + ' '.repeat(d.end - bodyAt) + masked.slice(d.end);
  }
  for (const d of docs) {
    // Ordered by the command that takes the heredoc, which can follow others on its line.
    const at = (re: RegExp) => d.start + Math.max(0, d.head.search(re));
    const catTarget = /\bcat\s*>\s*(\S*\.ino)\b/.exec(d.head)?.[1];
    if (catTarget) {
      // A copy written elsewhere (a debug build in /tmp) is not a version.
      if (SKETCH_FILE.test(resolvePath(cwdAt(masked, at(/\bcat\b/)), catTarget))) {
        ops.push({ pos: at(/\bcat\b/), kind: 'write', method: 'heredoc', body: d.body });
      }
    } else if (/\bpython3?\b/.test(d.head) && /\.ino\b/.test(d.body) && /(write|open\([^)]*['"]w)/.test(d.body)) {
      ops.push({ pos: at(/\bpython/), kind: 'write', method: 'python', script: d.body });
    } else if (/\bvlx-run\b/.test(d.head)) {
      const ms = /vlx-run[^\n]*?--ms\s+(\d+)/.exec(d.head);
      ops.push({ pos: at(/\bvlx-run\b/), kind: 'vlx', ms: ms ? Number(ms[1]) : 5000, actions: d.body });
    } else if (/>\s*\S*\.ino\b/.test(d.head) || (/\.ino\b/.test(d.body) && /\bpython/.test(d.head))) {
      ops.push({ pos: d.start, kind: 'write', method: 'unknown' });
    }
  }
  const scan = (re: RegExp, f: (m: RegExpExecArray) => Op | null) => {
    for (const m of masked.matchAll(re)) {
      const op = f(m as RegExpExecArray);
      if (op) ops.push(op);
    }
  };
  scan(/\barduino-cli\s+compile\b([^\n;&|>]*)/g, (m) => {
    // The sketch argument: the last non-option word. Compiling another sketch
    // (a debug copy) builds no version of the agent's.
    // `[^>]` stops inside a `2>&1`; drop its file-descriptor digit.
    const words = m[1].replace(/\s+\d+$/, '').trim().split(/\s+/);
    const optArg = new Set(['--fqbn', '-b', '--output-dir', '--build-path', '--build-property', '--libraries', '--library', '-e']);
    const positional = words.filter((w, i) => w && !w.startsWith('-') && !optArg.has(words[i - 1]));
    const sketch = resolvePath(cwdAt(masked, m.index!), positional.at(-1) ?? '.');
    if (!/^\/solution(\/[\w.-]+\.ino)?$/.test(sketch)) return null;
    return { pos: m.index!, kind: 'compile' };
  });
  scan(/\bcp\s+(\S*\.hex)\s+\S*solution\.hex\b/g, (m) => ({
    pos: m.index!,
    kind: 'cp',
    // A hex built from anything but /solution makes the artifact's version unknown.
    foreign: !resolvePath(cwdAt(masked, m.index!), m[1]).startsWith('/solution/'),
  }));
  scan(/\barduino-cli\s+lib\s+(search|install|list)\b([^\n|;&]*)/g, (m) => ({
    pos: m.index!, kind: 'lib', op: m[1] as LibStep['op'],
    query: m[2].replace(/\s*\d*>.*$/, '').trim().replace(/^["']|["']$/g, ''),
  }));
  scan(/\bsed\s+-i\S*\s+(?:''\s+)?((?:-e\s+)?(['"])(?:(?!\2).)+\2(?:\s+-e\s+(['"])(?:(?!\3).)+\3)*)\s+(\S*\.ino)\b/g, (m) =>
    SKETCH_FILE.test(resolvePath(cwdAt(masked, m.index!), m[4])) ? { pos: m.index!, kind: 'write', method: 'sed', sed: m[1] } : null,
  );
  // Only a command whose output *starts* with the marker submits (mini-swe-agent's
  // rule); `ls && echo COMPLETE…` prints it later and the run goes on.
  scan(/\bCOMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT\b/g, (m) => ({ pos: m.index!, kind: 'submit' }));
  // vlx-run without a heredoc: piped or no script. The script is rebuilt from its output.
  scan(/\bvlx-run\b([^\n|;&<]*)/g, (m) => {
    if (docs.some((d) => /\bvlx-run\b/.test(d.head) && d.start + d.head.search(/\bvlx-run\b/) === m.index)) return null;
    const ms = /--ms\s+(\d+)/.exec(m[1]);
    return { pos: m.index!, kind: 'vlx', ms: ms ? Number(ms[1]) : 5000, actions: null };
  });
  // Other shell writes into the sketch (echo/printf/tee) are not replayed.
  scan(/\b(?:echo|printf|tee)\b[^\n]*?(?:>>?|tee\s+(?:-a\s+)?)\s*\S*\.ino\b/g, (m) => ({ pos: m.index!, kind: 'write', method: 'unknown' }));
  return ops.sort((a, b) => a.pos - b.pos);
}

/** vlx-run reply body → lines. */
export function parseSimOutput(body: string): { lines: SimLine[]; errors: string[] } {
  const lines: SimLine[] = [];
  const errors: string[] = [];
  for (const raw of body.split('\n')) {
    if (raw.startsWith('ERROR: ')) {
      errors.push(raw.slice('ERROR: '.length));
      continue;
    }
    const m = /^\[(-?\d+) ms\] (.*)$/.exec(raw);
    if (!m) continue;
    const t = Number(m[1]);
    const rest = m[2];
    if (rest === 'end of run') lines.push({ t, kind: 'end', text: rest });
    else if (rest.startsWith('> ')) {
      const read = /^read (\S+) = (.*)$/.exec(rest.slice(2));
      lines.push(read ? { t, kind: 'action', text: rest.slice(2), value: read[2] } : { t, kind: 'action', text: rest.slice(2) });
    } else lines.push({ t, kind: 'serial', text: rest });
  }
  return { lines, errors };
}

/** The script that produced these action lines (reads lose their values). */
function scriptFromLines(lines: SimLine[]): string {
  return lines
    .filter((l) => l.kind === 'action')
    .map((l) => `${l.t} ${l.value === undefined ? l.text : l.text.slice(0, l.text.length - l.value.length - 3)}`)
    .join('\n');
}

/** A GNU sed basic regular expression → JS. */
export function breToJs(bre: string): string {
  let out = '';
  for (let i = 0; i < bre.length; i++) {
    const c = bre[i];
    if (c === '\\' && i + 1 < bre.length) {
      const n = bre[++i];
      // \( \) \{ \} \+ \? \| are BRE's operators; \n a newline; anything else stays escaped.
      if ('(){}+?|'.includes(n)) out += n;
      else if (n === 'n') out += '\\n';
      else out += `\\${n}`;
    } else if ('(){}+?|'.includes(c)) out += `\\${c}`; // literal in a BRE
    else out += c;
  }
  return out;
}

/** GNU sed's replacement text → a JS replacement function's result. */
function sedReplacement(r: string, m: string[]): string {
  return r.replace(/\\(\d|n|t|&|\\|.)|&/g, (all, e: string | undefined) => {
    if (e === undefined) return m[0];
    if (/\d/.test(e)) return m[Number(e)] ?? '';
    return e === 'n' ? '\n' : e === 't' ? '\t' : e;
  });
}

/** One `s<d>pattern<d>replacement<d>[g]` at `i`, and where it ends. */
function parseS(expr: string, i: number): { pattern: string; replacement: string; global: boolean; end: number } | null {
  if (expr[i] !== 's' || !expr[i + 1]) return null;
  const d = expr[i + 1];
  const parts: string[] = [];
  let cur = '';
  let j = i + 2;
  for (; j < expr.length && parts.length < 2; j++) {
    if (expr[j] === '\\' && j + 1 < expr.length) cur += expr[j] + expr[++j];
    else if (expr[j] === d) {
      parts.push(cur);
      cur = '';
    } else cur += expr[j];
  }
  if (parts.length !== 2) return null;
  const flags = /^[gI]*/.exec(expr.slice(j))![0];
  if (flags.includes('I')) return null;
  const unescapeDelim = (x: string) => x.split(`\\${d}`).join(d);
  return { pattern: unescapeDelim(parts[0]), replacement: unescapeDelim(parts[1]), global: flags.includes('g'), end: j + flags.length };
}

/**
 * A sed script of s commands (`;`-separated, or several `-e`), as GNU sed
 * applies it: every command to each line in turn. Null for anything else.
 */
export function applySed(script: string, source: string): string | null {
  const exprs = [...script.matchAll(/(['"])((?:(?!\1).)+)\1/g)].map((m) => m[2]);
  const cmds: Array<{ re: RegExp; replacement: string }> = [];
  try {
    for (const e of exprs) {
      let i = 0;
      while (i < e.length) {
        while (i < e.length && /[\s;]/.test(e[i])) i++;
        if (i >= e.length) break;
        const s = parseS(e, i);
        if (!s) return null;
        cmds.push({ re: new RegExp(breToJs(s.pattern), s.global ? 'g' : ''), replacement: s.replacement });
        i = s.end;
      }
    }
  } catch {
    return null;
  }
  if (!cmds.length) return null;
  return source
    .split('\n')
    .map((line) => cmds.reduce((l, c) => l.replace(c.re, (...m) => sedReplacement(c.replacement, m.slice(0, -2) as string[])), line))
    .join('\n');
}

/**
 * vlx-run's reply alone, without what later commands in the same shell line
 * printed after it (`vlx-run …; grep …`). The reply ends at its end-of-run or
 * no-output line, or after its ERROR lines.
 */
export function trimReply(text: string): string {
  const lines = text.split('\n');
  const end = lines.findIndex((l) => /^\[-?\d+ ms\] end of run$/.test(l) || /^No output in \d+ simulated ms\.$/.test(l));
  if (end >= 0) return lines.slice(0, end + 1).join('\n') + '\n';
  const lastErr = lines.map((l) => l.startsWith('ERROR: ')).lastIndexOf(true);
  if (lastErr >= 0) return lines.slice(0, lastErr + 1).join('\n') + '\n';
  return text.replace(/\n+$/, '\n');
}

/** Splits a compound command's output at each vlx-run banner. */
function outputParts(body: string): { pre: string; runs: string[] } {
  const parts = body.split(BANNER);
  return { pre: parts[0], runs: parts.slice(1).map((p) => trimReply(p.replace(/^\n/, ''))) };
}

function compileResult(pre: string, code: number | null, last: boolean): { ok: boolean; excerpt: string } {
  if (/Sketch uses \d+ bytes/.test(pre)) {
    return { ok: true, excerpt: (/Sketch uses[^\n]*/.exec(pre) ?? [''])[0] };
  }
  const failed = /error:|Error during build|Compilation error|exit status 1/i.test(pre) || (last && code !== null && code !== 0);
  const errLines = pre.split('\n').filter((l) => /error/i.test(l)).slice(0, 4);
  return { ok: !failed, excerpt: (errLines.length ? errLines.join('\n') : pre.trim().split('\n').slice(-3).join('\n')).slice(0, 600) };
}

/** Feed one trajectory message (in order). Tool results must follow their call. */
export function ingest(run: Run, m: Message, next?: Message): void {
  const msgIndex = run.cursor.msgs++;
  if (m.role === 'user' && m.extra?.follow_up) {
    run.steps.push({ id: `m${msgIndex}.0`, msgIndex, at: null, thought: '', kind: 'user', text: text(m.content).trim() });
    return;
  }
  if (m.role !== 'assistant') return;
  const ts = m.extra?.timestamp ?? null;
  if (ts !== null && run.cursor.t0 === null) run.cursor.t0 = ts;
  const at = ts !== null && run.cursor.t0 !== null ? Math.round((ts - run.cursor.t0) * 10) / 10 : null;
  const thought = trimThought(m);
  const obs = observation(next);
  const cmds = commandsOf(m);
  let k = 0;
  for (const cmd of cmds) {
    const ops = parseCommand(cmd);
    const { pre, runs } = outputParts(obs.body);
    let runIdx = 0;
    let compiledOkHere: boolean | null = null;
    ops.forEach((op, i) => {
      const base = { id: `m${msgIndex}.${k++}`, msgIndex, at, thought };
      const c = run.cursor;
      if (op.kind === 'write') {
        let source: string | null = null;
        let note: string | undefined;
        if (op.method === 'heredoc') source = op.body! + '\n';
        else if (op.method === 'python') {
          if (c.source === null) note = 'edit of an unknown version';
          else {
            const r = applyPyEdits(op.script!, c.source);
            if (r.ok) source = r.source;
            else note = r.reason;
          }
        } else if (op.method === 'sed') {
          source = c.source === null ? null : applySed(op.sed!, c.source);
          if (source === null) note = 'sed expression not replayed';
        } else note = 'write style not replayed';
        // An edit that changes nothing is not a new version.
        if (source !== null && source === c.source) return;
        // Back-to-back edits in one command (`sed -i …; sed -i …`) are one version.
        const prev = ops[i - 1]?.kind === 'write' ? run.steps.at(-1) : undefined;
        if (prev?.kind === 'write' && prev.msgIndex === msgIndex) {
          const v = run.versions[prev.version - 1];
          v.source = source;
          c.source = source;
          prev.reconstructed = prev.reconstructed && source !== null;
          prev.note ??= note;
          return;
        }
        const n = run.versions.length + 1;
        run.versions.push({ n, source, stepId: base.id });
        c.source = source;
        run.steps.push({ ...base, kind: 'write', version: n, method: op.method, reconstructed: source !== null, note });
      } else if (op.kind === 'compile') {
        const isLast = !ops.slice(i + 1).some((o) => o.kind === 'compile' || o.kind === 'vlx');
        const r = compileResult(pre, obs.code, isLast);
        compiledOkHere = r.ok;
        const version = run.versions.length || null;
        if (r.ok) c.compiled = version;
        run.steps.push({ ...base, kind: 'compile', version, ok: r.ok, excerpt: r.excerpt });
      } else if (op.kind === 'cp') {
        // `compile && cp`: a failed compile leaves the hex as it was.
        if (op.foreign) c.hex = null;
        else if (compiledOkHere !== false) c.hex = c.compiled;
      } else if (op.kind === 'vlx') {
        const reply = runs[runIdx++];
        if (reply === undefined) return; // never ran (an earlier && failed)
        const { lines, errors } = parseSimOutput(reply);
        // A script piped in (echo/printf) is not parsed; its echoed lines are the script.
        const fromOutput = op.actions === null && lines.some((l) => l.kind === 'action');
        const actions = fromOutput ? scriptFromLines(lines) || null : op.actions;
        run.steps.push({
          ...base,
          kind: 'simulate',
          version: c.hex,
          runMs: op.ms,
          actions: actions && actions.trim() ? actions : null,
          actionsFromOutput: fromOutput,
          output: reply.replace(/\n+$/, '\n'),
          lines,
          errors,
          ok: errors.length === 0,
        });
      } else if (op.kind === 'lib') {
        run.steps.push({ ...base, kind: 'lib', op: op.op, query: op.query });
      } else if (op.kind === 'submit') {
        if (next === undefined || next.role === 'exit' || obs.body.trimStart().startsWith('COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT')) {
          run.steps.push({ ...base, kind: 'submit' });
        }
      }
    });
  }
}

export function extractRun(traj: { messages: Message[] }): Run {
  const run = newRun();
  const ms = traj.messages;
  ms.forEach((m, i) => ingest(run, m, ms[i + 1]));
  return run;
}

/** +added/−removed line counts between two sources. */
export function diffStat(a: string | null, b: string | null): { added: number; removed: number } | null {
  if (a === null || b === null) return null;
  const A = a.split('\n');
  const B = b.split('\n');
  // LCS on lines; sketches are a few hundred lines at most.
  const dp: number[][] = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const common = dp[0][0];
  return { added: B.length - common, removed: A.length - common };
}
