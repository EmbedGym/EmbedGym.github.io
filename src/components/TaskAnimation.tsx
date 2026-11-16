import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import type {CircuitLike} from '../../vendor/velxio/frontend/src/utils/wireTidy/geometry';
import type {Cell} from '../../vendor/velxio/demo/cells/cell';
import BOARDS from '../../vendor/velxio/demo/cells/boards.json';

export type DemoBoard = keyof typeof BOARDS;
export function demoBoard(target: string): DemoBoard {
  const found = Object.entries(BOARDS).find(([, board]) => board.target === target || ('twin' in board && board.twin === target));
  if (!found) throw new Error(`No demo board for ${target}`);
  return found[0] as DemoBoard;
}
let runtime: Promise<typeof import('../../vendor/velxio/demo/cells/mount')> | undefined;
function loadRuntime() {
  return runtime ??= Promise.all([
    import('@wokwi/elements'),
    import('../../vendor/velxio/frontend/src/components/velxio-components/registerAll'),
    import('../../vendor/velxio/frontend/src/components/velxio-components/Esp32Element'),
    import('../../vendor/velxio/frontend/src/components/velxio-components/Nrf52840DkElement'),
  ]).then(() => import('../../vendor/velxio/demo/cells/mount'));
}
const artTheme = {
  '--ink': 'var(--color-text-primary)', '--muted': 'var(--color-text-secondary)',
  '--accent': 'var(--color-accent)', '--warn': 'var(--embedgym-signal)',
  '--sans': 'var(--font-family-body)', '--mono': 'var(--font-family-code)',
  '--font-sans': 'var(--font-family-body)',
} as CSSProperties;

// The original demo cells are illustrations, never evidence of an agent run.
// TraceCanvas uses only the shared circuit renderer, with no illustrative cell.
export function CircuitScene({task, target, paused = false, time, traceComponent, traceValues, onDuration, onTime, onError}: {
  task: string; target: string; paused?: boolean; time?: number; traceComponent?: string | null; traceValues?: Record<string, Record<string, unknown>>;
  onDuration?: (duration: number) => void; onTime?: (time: number) => void; onError?: (message: string) => void;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const seek = useRef<((t: number) => void) | null>(null);
  const clock = useRef(0);
  const resume = useRef<(() => void) | null>(null);
  const controls = useRef({paused, time, onTime}); controls.current = {paused, time, onTime};
  const callbacks = useRef({onDuration, onError}); callbacks.current = {onDuration, onError};
  const [error, setError] = useState('');
  const board = demoBoard(target);
  const isTrace = traceComponent !== undefined;
  const selected = useRef(traceComponent); selected.current = traceComponent;
  const observations = useRef(traceValues); observations.current = traceValues;
  useEffect(() => {
    const box = outer.current!, root = host.current!;
    let dead = false, raf = 0, visible = false, mounted = false, last = 0, reported = 0, duration = 1;
    const abort = new AbortController();
    setError(''); clock.current = 0;
    const resize = new ResizeObserver(() => {root.style.transform = `scale(${box.clientWidth / 590})`;});
    resize.observe(box);
    const tick = (now: number) => {
      raf = 0;
      if (dead || !visible || !mounted) {last = 0; return;}
      if ((controls.current.paused || isTrace) && mounted) {seek.current?.(controls.current.time ?? clock.current); last = 0; return;}
      if (last) clock.current = (clock.current + Math.min(100, now - last)) % duration;
      last = now;
      seek.current?.(controls.current.time ?? clock.current);
      if (now - reported > 120) {controls.current.onTime?.(controls.current.time ?? clock.current); reported = now;}
      raf = requestAnimationFrame(tick);
    };
    resume.current = () => {if (visible && mounted && !raf && !controls.current.paused && !isTrace) raf = requestAnimationFrame(tick);};
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && mounted && !raf) raf = requestAnimationFrame(tick);
    }); seen.observe(box);
    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      void (async () => {
        const [{mountCell}, registry, response] = await Promise.all([loadRuntime(), import('../../vendor/velxio/demo/cells/registry'), fetch(`${import.meta.env.BASE_URL}demo/circuits/${board}/${task}.json`, {signal: abort.signal})]);
        if (!response.ok) throw new Error('Circuit unavailable.');
        const circuit = await response.json() as CircuitLike;
        if (dead) return;
        // A trace highlights only the component named in the recorded event.
        const baseline = new Map<string, {el: Record<string, unknown>; property: string; value: unknown}>();
        const cell: Cell = isTrace ? {duration: 1, run(_t, view) {
          // Only replay values actually observed in the record and exposed by
          // the visual element. No inferred sensor/firmware behavior.
          for (const [id, fields] of Object.entries(observations.current ?? {})) {
            if (!circuit.components.some(c => c.id === id)) continue;
            const el = view.part<Record<string, unknown>>(id);
            for (const [property, value] of Object.entries(fields)) {
              if (!['value', 'brightness', 'angle', 'temperature', 'humidity', 'distance'].includes(property) || !(property in el)) continue;
              const key = `${id}.${property}`;
              if (!baseline.has(key)) baseline.set(key, {el, property, value: el[property]});

            }
          }
          for (const [key, saved] of baseline) {
            const id = key.slice(0, key.indexOf('.'));
            const fields = observations.current?.[id];
            const value = fields && saved.property in fields ? fields[saved.property] : saved.value;
            if (saved.el[saved.property] !== value) saved.el[saved.property] = value;
          }
          for (const wire of circuit.wires) if (selected.current && [wire.start.componentId, wire.end.componentId].includes(selected.current)) view.glowWire(wire.id, 1);
        }} : await registry.loadCell(board, task);
        if (dead) return;
        const result = await mountCell(root, circuit, cell);
        if (dead) {root.replaceChildren(); return;}
        seek.current = result.seek; duration = cell.duration; mounted = true;
        result.seek(0); root.dataset.ready = 'true';
        callbacks.current.onDuration?.(duration);
        if (visible && !raf) raf = requestAnimationFrame(tick);
      })().catch(e => {if (!dead) {setError(e.message); callbacks.current.onError?.(e.message);}});
    }, {rootMargin: '100% 0px'}); near.observe(box);
    return () => {dead = true; abort.abort(); cancelAnimationFrame(raf); seen.disconnect(); near.disconnect(); resize.disconnect(); seek.current = null; resume.current = null; root.replaceChildren();};
  }, [task, board, isTrace]);
  useEffect(() => {
    if (time !== undefined) clock.current = time;
    seek.current?.(time ?? clock.current);
    resume.current?.();
  }, [time, paused, traceComponent, traceValues]);
  return <VStack ref={outer} role="img" aria-label={`${BOARDS[board].label}: ${task.replaceAll('_', ' ')} ${isTrace ? 'recorded interaction' : 'illustrative animation'}`} style={{position: 'relative', aspectRatio: '590 / 288', overflow: 'hidden', width: '100%'}}>
    <VStack ref={host} className="cell-root" style={artTheme} />
    {error && <Text role="alert">Animation unavailable: {error}</Text>}
  </VStack>;
}
export function TaskAnimation({task, target, compact = false}: {task: string; target: string; compact?: boolean}) {
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [seekTime, setSeekTime] = useState<number>();
  useEffect(() => {setSeekTime(undefined); setTime(0); setDuration(1);}, [task, target]);
  return <VStack gap={2}>
    <CircuitScene key={`${task}/${target}`} task={task} target={target} paused={paused} time={seekTime} onDuration={setDuration} onTime={setTime} />
    <HStack gap={2} hAlign="between" wrap="wrap"><Text type="supporting" color="secondary">{BOARDS[demoBoard(target)].label} · Illustration</Text><Button label={paused ? 'Play' : 'Pause'} variant="ghost" onClick={() => {setSeekTime(undefined); setPaused(v => !v);}} /></HStack>
    {!compact && <input aria-label="Animation time" type="range" min={0} max={Math.max(0, duration - 1)} step={1} value={time} onChange={e => {const value = Number(e.target.value); setPaused(true); setSeekTime(value); setTime(value);}} style={{width: '100%', accentColor: 'var(--color-accent)'}} />}
  </VStack>;
}
