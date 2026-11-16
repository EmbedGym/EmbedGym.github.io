import {ingest, newRun, type Step, type Version, type SimLine} from '../vendor/velxio/demo/lab/extract';
import type {RunDetail} from './data';

export type Call = RunDetail['steps'][number]['calls'][number];
export type TraceEvent = {
  id: string; label: string; kind: Step['kind'] | 'shell' | 'response';
  round: number; thought: string; call?: Call; version: number | null;
  step?: Step; lines: SimLine[];
};
export type Trace = {events: TraceEvent[]; versions: Version[]};

// Reuse the demo reducer, but pair each tool call with its own exported result.
// Unsupported edits stay unknown; the final submission is never substituted
// for an earlier version. Large, deferred output remains accessible as raw data.
export function buildTrace(detail: Pick<RunDetail, 'steps'>): Trace {
  const run = newRun();
  const events: TraceEvent[] = [];
  for (const round of detail.steps) {
    if (!round.calls.length) events.push({id: `r${round.index}`, kind: 'response', label: 'Response', round: round.index, thought: round.text, version: run.versions.length || null, lines: []});
    for (const [ci, call] of round.calls.entries()) {
      const before = run.steps.length;
      // Null means not saved/deferred, rather than a successful empty reply.
      const reply = {role: 'tool', content: `<returncode>${call.returncode ?? -1}</returncode>\n<output>\n${call.output ?? ''}</output>`};
      ingest(run, {role: 'assistant', content: round.text, tool_calls: [{function: {arguments: JSON.stringify({command: call.command})}}]}, reply);
      const extracted = run.steps.slice(before);
      if (!extracted.length) events.push({id: `r${round.index}c${ci}`, kind: 'shell', label: call.hardware ? 'Hardware call' : 'Shell', round: round.index, thought: round.text, call, version: run.versions.length || null, lines: []});
      for (const s of extracted) {
        const label = s.kind === 'write' ? s.version === 1 ? 'Write' : 'Fix' : s.kind === 'simulate' ? 'Simulate' : s.kind === 'compile' ? 'Compile' : s.kind === 'lib' ? 'Library' : s.kind === 'submit' ? 'Submit' : 'Message';
        events.push({id: s.id, kind: s.kind, label, round: round.index, thought: round.text, call, version: 'version' in s ? s.version : run.versions.length || null, step: s, lines: s.kind === 'simulate' ? s.lines : []});
      }
    }
  }
  // Match the demo's Observe phase: the last simulator call before a fix.
  let lastSimulation: TraceEvent | undefined;
  for (const event of events) {
    if (event.kind === 'simulate') lastSimulation = event;
    if (event.kind === 'write' && (event.version ?? 0) > 1 && lastSimulation) {
      lastSimulation.label = 'Simulate → Observe';
      lastSimulation = undefined;
    }
  }
  return {events, versions: run.versions};
}

// Bounded line diff. Preserve exact source in the Code view; report no diff
// for oversized files instead of allocating an unbounded LCS matrix.
export function lineDiff(before: string, after: string): string | null {
  const a = before.split('\n'), b = after.split('\n');
  if (a.length * b.length > 1_000_000) return null;
  const rows = Array.from({length: a.length + 1}, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const out: string[] = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {out.push(`  ${a[i++]}`); j++;}
    else if (j < b.length && (i === a.length || rows[i][j + 1] >= rows[i + 1][j])) out.push(`+ ${b[j++]}`);
    else out.push(`- ${a[i++]}`);
  }
  return out.join('\n');
}
