/**
 * Measure each part's footprint and pinInfo by mounting its real element in an
 * off-screen host. pinInfo only exists on a live custom element (CLAUDE.md 6a),
 * so this is the one browser-bound step; everything downstream is pure.
 */

import { ComponentRegistry } from '../../services/ComponentRegistry';
import type { CircuitLike, GeomMap, PartGeom, PinGeom } from './geometry';

export interface BoardElementSpec {
  tag: string;
  attrs?: Record<string, string>;
}

/** The testbench boards. Callers can pass their own resolver for others. */
export const DEFAULT_BOARD_ELEMENTS: Record<string, BoardElementSpec> = {
  'arduino-mega': { tag: 'wokwi-arduino-mega' },
  'arduino-uno': { tag: 'wokwi-arduino-uno' },
  'arduino-nano': { tag: 'wokwi-arduino-nano' },
  'esp32-s3': { tag: 'velxio-esp32', attrs: { 'board-kind': 'esp32-s3' } },
  esp32: { tag: 'velxio-esp32', attrs: { 'board-kind': 'esp32' } },
  'nrf52840-dk': { tag: 'velxio-nrf52840-dk' },
  'raspberry-pi-pico': { tag: 'velxio-pi-pico-w' },
  'pi-pico-w': { tag: 'velxio-pi-pico-w' },
};

const COMPONENT_OFFSET = 6; // DynamicComponent wrapper: padding 4 + border 2

const cache = new Map<string, Omit<PartGeom, 'id'>>();

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function measureElement(
  tag: string,
  attrs: Record<string, string>,
  props: Record<string, unknown>,
  host: HTMLElement,
): Promise<{ w: number; h: number; pins: PinGeom[] }> {
  await Promise.race([customElements.whenDefined(tag), new Promise((r) => setTimeout(r, 2000))]);
  const el = document.createElement(tag) as HTMLElement & { updateComplete?: Promise<unknown>; pinInfo?: PinGeom[] };
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const [k, v] of Object.entries(props)) {
    try {
      (el as unknown as Record<string, unknown>)[k] = v;
    } catch {
      /* read-only prop */
    }
  }
  host.appendChild(el);
  await el.updateComplete;
  await nextFrame();
  // Images inside the shadow root (velxio boards) size from attributes, so a frame is enough.
  const r = el.getBoundingClientRect();
  let w = r.width;
  let h = r.height;
  for (const svg of el.shadowRoot?.querySelectorAll('svg, img') ?? []) {
    const sr = (svg as Element).getBoundingClientRect();
    if (sr.width * sr.height > w * h) {
      w = sr.width;
      h = sr.height;
    }
  }
  const pins = (el.pinInfo ?? []).map((p) => ({ ...p, name: p.name, x: p.x, y: p.y }));
  el.remove();
  return { w, h, pins };
}

/** DynamicComponent's .component-label: 11px text that can be wider than the part. */
function measureLabel(text: string, host: HTMLElement): number {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;display:inline-flex;font-size:11px;white-space:nowrap;';
  el.className = 'component-label';
  el.textContent = text;
  host.appendChild(el);
  const w = el.getBoundingClientRect().width;
  el.remove();
  return Math.ceil(w);
}

export async function probeGeometry(
  circuit: CircuitLike,
  boardElement: (boardKind: string) => BoardElementSpec | undefined = (k) => DEFAULT_BOARD_ELEMENTS[k],
): Promise<GeomMap> {
  const registry = ComponentRegistry.getInstance();
  await registry.loadPromise;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:-30000px;top:0;visibility:hidden;pointer-events:none;';
  document.body.appendChild(host);
  const geoms: GeomMap = new Map();
  try {
    for (const b of circuit.boards) {
      const spec = boardElement(b.boardKind);
      if (!spec) throw new Error(`wireTidy: no element for boardKind '${b.boardKind}'`);
      const key = `board:${spec.tag}:${JSON.stringify(spec.attrs ?? {})}`;
      let m = cache.get(key);
      if (!m) {
        m = { kind: 'board', offset: 0, ...(await measureElement(spec.tag, spec.attrs ?? {}, {}, host)) };
        cache.set(key, m);
      }
      geoms.set(b.id, { id: b.id, ...m });
    }
    for (const c of circuit.components) {
      const meta = registry.getById(c.metadataId);
      if (!meta) throw new Error(`wireTidy: metadataId '${c.metadataId}' not in the registry`);
      const props = c.properties ?? {};
      const label = props.pin !== undefined ? `Pin ${props.pin}` : meta.name;
      const key = `comp:${meta.tagName}:${label}:${JSON.stringify(props)}`;
      let m = cache.get(key);
      if (!m) {
        m = {
          kind: 'component',
          offset: COMPONENT_OFFSET,
          labelW: measureLabel(label, host),
          ...(await measureElement(meta.tagName, {}, props, host)),
        };
        cache.set(key, m);
      }
      geoms.set(c.id, { id: c.id, ...m });
    }
  } finally {
    host.remove();
  }
  return geoms;
}
