import {useEffect, useState} from 'react';

export type Mode = 'nosim' | 'sim_s' | 'sim';
export type Task = {id: string; name: string; description: string; level: number; parts: string[]; targets: string[]; application: string; interface: string; protocols: string[]};
export type Target = {id: string; mcu: string; framework: string; taskCount: number; browserRunnable: boolean; compiler: string; fqbn: string; facts: Record<string, string>};
export type Part = {id: string; name: string; kind: 'peripheral' | 'support'; section: string; pins: string; usage: string[]; implemented: string[]; verified: string[]; unitTest: string};
export type Catalog = {schema: number; models: Record<string, string>; levels: Record<Mode, string>; tasks: Task[]; targets: Target[]; components: Part[]};
export type Run = {id: string; task: string; target: string; model: string; mode: Mode; verdict: string; passed: number | null; failed: number | null; cost: number | null; rounds: number | null; wallClockS: number | null; tokens: Record<string, number> | null; hasFirmware: boolean; exitStatus: string; application: string; interface: string; recovered: boolean};
export type Endpoint = {componentId: string; pinName: string; x: number; y: number};
export type Circuit = {boards: {id: string; boardKind: string; x: number; y: number}[]; components: {id: string; metadataId: string; x: number; y: number; properties?: Record<string, unknown>}[]; wires: {id: string; start: Endpoint; end: Endpoint; color: string}[]};
export type Variant = {circuit: Circuit; pinout: Record<string, Record<string, string>>; tests: Record<string, unknown>[]; testOrigin: string; testSha256: string; source: string | null; overlays: Record<string, string>; referenceHex: string | null};
export type TaskDetail = Task & {variants: Record<string, Variant>};
export type RunDetail = Run & {gradeSummary: string | null; failing: string[]; gradeLog: string | null; files: Record<string, string>; hex: string | null; steps: {index: number; text: string; calls: {command: string; output: string | null; outputParts?: string[]; outputLength?: number; returncode: number | null; hardware: boolean}[]; formatError?: string}[]; provenance: {testHash: string; sourceCommit: string; trajectorySha256: string; runId: string}};
export type Baseline = {method: string; setting: string; model: string; target: string; passed: number; total: number; cost_usd: number | null};

// Small indexes are shared, detail artifacts load on demand. Failed fetches are
// evicted so retry works; late requests can never overwrite a newer selection.
const cache = new Map<string, Promise<unknown>>();
export function loadData<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const pending = fetch(`${import.meta.env.BASE_URL}data/${path}`).then(async response => {
      if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
      if (path.endsWith('.gz')) {
        // Vite serves .gz with Content-Encoding, so fetch already decompresses
        // it. Static hosts may serve the file verbatim. Inspect the gzip magic
        // bytes rather than decompressing twice or relying on host headers.
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(bytes));
        if (typeof DecompressionStream === 'undefined') throw new Error('This browser needs gzip stream support to open the research archive. Please use a current browser.');
        return JSON.parse(await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
      }
      return response.json();
    }).catch(error => {cache.delete(path); throw error;});
    if (cache.size >= 96) {
      const oldest = [...cache.keys()].find(key => key !== 'catalog.json' && key !== 'runs.json.gz');
      if (oldest) cache.delete(oldest);
    }
    cache.set(path, pending);
  }
  return cache.get(path) as Promise<T>;
}
export function useData<T>(path: string | null) {
  const [state, setState] = useState<{path: string | null; data?: T; error?: string}>({path: null});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (path) loadData<T>(path).then(data => {if (active) setState({path, data});}, error => {if (active) setState({path, error: String(error.message ?? error)});});
    return () => {active = false;};
  }, [path, attempt]);
  return {data: state.path === path ? state.data : undefined, error: state.path === path ? state.error : undefined,
    retry: () => {setState({path: null}); setAttempt(a => a + 1);}};
}
export const modes: Mode[] = ['nosim', 'sim_s', 'sim'];
export const pct = (runs: Run[]) => runs.length ? `${(100 * runs.filter(r => r.verdict === 'pass').length / runs.length).toFixed(1)}%` : '—';
export const mean = (values: (number | null | undefined)[]) => {
  const present = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
};
export const targetLabel = (catalog: Catalog, id: string) => {const t = catalog.targets.find(t => t.id === id); return t ? `${t.mcu} · ${t.framework}` : id;};
export const taskLabel = (catalog: Catalog, id: string) => catalog.tasks.find(t => t.id === id)?.name ?? id;
