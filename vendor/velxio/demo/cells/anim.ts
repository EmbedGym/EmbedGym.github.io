// Time helpers for cell animations. A cell's run() is a pure function of time,
// so everything here is too: no timers, no unseeded randomness.

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** 0 → 1 as t goes from start to start + length. */
export const progress = (t: number, start: number, length: number) => clamp((t - start) / length);

export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** ms since the latest event at or before t; Infinity before the first. */
export const sinceLast = (t: number, events: number[]) => {
  const past = events.filter((e) => e <= t);
  return past.length ? t - Math.max(...past) : Infinity;
};
