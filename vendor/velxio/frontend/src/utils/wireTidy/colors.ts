/**
 * Wire colour convention: red only for supply nets (VCC/5V/3V3), black only
 * for ground, and signal wires in distinct palette colours that are never
 * red- or black-looking, so a signal never reads as power.
 */

import { findPin, isGroundPin, isPowerPin, netsOf, type CircuitLike, type GeomMap, type WireLike } from './geometry';

export const SUPPLY_COLOR = '#ff0000';
export const GROUND_COLOR = '#000000';

/** Signal palette: well apart in hue, none red, black, white or grey. */
export const SIGNAL_PALETTE = ['#22c55e', '#2563eb', '#f97316', '#a855f7', '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#8b5cf6', '#f59e0b', '#0ea5e9'];

function hsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  const v = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/** Would this colour be read as power (red) or ground (black)? Greys and white too: they vanish. */
export function looksLikePower(hex: string): boolean {
  const c = hsl(hex);
  if (!c) return true;
  if (c.l < 0.22) return true; // black / near-black
  if (c.s < 0.25) return true; // grey / white
  return (c.h < 18 || c.h > 340) && c.s > 0.45; // red
}

export type NetKind = 'ground' | 'supply' | 'signal';

/**
 * Each wire's net kind: ground if its net reaches a ground pin, supply if it
 * reaches a supply pin, signal otherwise. By net, not by the wire's own
 * endpoints, so a resistor-to-button wire on the 5V net is still red.
 */
export function wireKinds(circuit: CircuitLike, geoms: GeomMap): Map<string, NetKind> {
  const nets = netsOf(circuit, geoms);
  const kindOfNet = new Map<number, NetKind>();
  for (const w of circuit.wires) {
    const net = nets.get(w.id)!;
    const pins = [w.start, w.end].map((e) => {
      const g = geoms.get(e.componentId);
      return (g && findPin(g, e.pinName)?.name) || e.pinName;
    });
    const k: NetKind = pins.some(isGroundPin) ? 'ground' : pins.some(isPowerPin) ? 'supply' : 'signal';
    const prev = kindOfNet.get(net);
    if (prev === 'ground' || (prev === 'supply' && k === 'signal')) continue;
    kindOfNet.set(net, k);
  }
  return new Map(circuit.wires.map((w) => [w.id, kindOfNet.get(nets.get(w.id)!) ?? 'signal']));
}

/**
 * Apply the convention. Signal wires keep their authored colour when it is a
 * proper signal colour and unique among the signal wires of the same part;
 * otherwise that part's signal wires are recoloured from the palette, in pin
 * order, skipping colours already used on the part.
 */
export function applyColors<W extends WireLike>(wires: W[], circuit: CircuitLike, geoms: GeomMap): W[] {
  const kinds = wireKinds({ ...circuit, wires }, geoms);
  const boardIds = new Set(circuit.boards.map((b) => b.id));
  const out = new Map<string, string>();
  const groups = new Map<string, W[]>();
  for (const w of wires) {
    const k = kinds.get(w.id);
    if (k === 'ground') out.set(w.id, GROUND_COLOR);
    else if (k === 'supply') out.set(w.id, SUPPLY_COLOR);
    else {
      const part = boardIds.has(w.start.componentId) ? w.end.componentId : w.start.componentId;
      groups.set(part, [...(groups.get(part) ?? []), w]);
    }
  }
  for (const [part, ws] of groups) {
    const g = geoms.get(part);
    const pinKey = (w: W) => {
      const name = w.start.componentId === part ? w.start.pinName : w.end.pinName;
      const p = g ? findPin(g, name) : undefined;
      return p ? p.x * 1000 + p.y : 0;
    };
    const sorted = [...ws].sort((a, b) => pinKey(a) - pinKey(b));
    const colours = sorted.map((w) => w.color.toLowerCase());
    const keep = colours.every((c, i) => !looksLikePower(c) && colours.indexOf(c) === i);
    if (keep) continue;
    let next = 0;
    for (const w of sorted) out.set(w.id, SIGNAL_PALETTE[next++ % SIGNAL_PALETTE.length]);
  }
  return wires.map((w) => (out.has(w.id) ? { ...w, color: out.get(w.id)! } : w));
}
