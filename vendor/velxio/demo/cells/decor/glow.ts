import { LAMP_GLOW, RED_GLOW, WARM_GLOW, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };

/** `heat`: body warmth for a thermal sensor; `lamp`: a lit bulb; `red`: a red LED. */
export type GlowTone = 'heat' | 'lamp' | 'red';

const FADE: Record<GlowTone, string> = {
  heat: `${WARM_GLOW} 0%, transparent 100%`,
  lamp: `${LAMP_GLOW} 0%, color-mix(in srgb, ${LAMP_GLOW} 35%, transparent) 45%, transparent 100%`,
  red: `${RED_GLOW} 0%, color-mix(in srgb, ${RED_GLOW} 37%, transparent) 50%, transparent 100%`,
};

/**
 * A soft round glow 100 px across times `scale`, centred on the element's
 * (0, 0), at `level` (default 0, hidden) until `setGlow` places it.
 */
export function glow(key: string, opts: { tone: GlowTone; scale?: number; level?: number }): string {
  const d = 100 * (opts.scale ?? 1);
  return `
    <div data-glow="${key}" style="position:absolute;left:0;top:0;opacity:${opts.level ?? 0};pointer-events:none">
      <div style="position:absolute;left:${-d / 2}px;top:${-d / 2}px;width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle closest-side, ${FADE[opts.tone]})"></div>
    </div>`;
}

/** Centres glow `key` on `at` at `level` (0 off, 1 full). */
export function setGlow(view: DecorView, key: string, at: Point, level: number) {
  const el = view.q<HTMLElement>(`[data-glow="${key}"]`);
  el.style.transform = `translate(${at.x}px, ${at.y}px)`;
  el.style.opacity = String(level);
}

const pulse = (t: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 2000);

export const samples: DecorSample[] = (['heat', 'lamp', 'red'] as const).map((tone) => ({
  name: `glow: ${tone}`,
  w: 110,
  h: 110,
  html: glow(tone, { tone }),
  duration: 2000,
  play: (view: DecorView, t: number) => setGlow(view, tone, { x: 55, y: 55 }, pulse(t)),
}));
