import type { Cell } from '../../cell';

type Led = HTMLElement & { value: boolean };

// The sketch toggles each LED on its own millis() interval, both starting off.
const CHANNELS = [
  { led: 'L1', wires: ['w-2-R1', 'w-R1-L1'], label: 'pin 2', rate: '1 Hz', half: 500, color: '#ff8800', top: 44 },
  { led: 'L2', wires: ['w-3-R2', 'w-R2-L2'], label: 'pin 3', rate: '2 Hz', half: 250, color: '#0066ff', top: 108 },
];
export const isOn = (t: number, half: number) => Math.floor(t / half) % 2 === 1;

// A two-channel logic trace: the last WINDOW ms, newest at the right.
const SCOPE = { x: -216, y: -156, w: 280, h: 146 };
export const TRACE = { x: 16, w: 248, swing: 26 };
const WINDOW = 2000;

export function tracePath(t: number, half: number, top: number) {
  const px = (ms: number) => TRACE.x + TRACE.w * (1 - (t - ms) / WINDOW);
  const level = (ms: number) => top + (isOn(ms + 4 * WINDOW, half) ? 0 : TRACE.swing);
  let ms = t - WINDOW;
  let d = `M ${px(ms)} ${level(ms)}`;
  while (true) {
    const edge = Math.floor(ms / half) * half + half;
    if (edge > t) break;
    d += ` H ${px(edge)} V ${level(edge)}`;
    ms = edge;
  }
  return `${d} H ${px(t)}`;
}

const blinkTwoLeds: Cell = {
  duration: 4000,
  decor: {
    html: `
      <style>
        .c-b2-scope {
          position: absolute; left: ${SCOPE.x}px; top: ${SCOPE.y}px; width: ${SCOPE.w}px; height: ${SCOPE.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-b2-label { font-family: var(--mono); font-size: 20px; fill: var(--ink); }
        .c-b2-rate { font-family: var(--mono); font-size: 20px; fill: var(--muted); }
        .c-b2-trace { fill: none; stroke-width: 4; stroke-linejoin: round; }
      </style>
      <div class="c-b2-scope">
        <svg width="${SCOPE.w}" height="${SCOPE.h}" style="position:absolute;left:0;top:0">
          ${CHANNELS.map(
            (c, i) => `
              <text class="c-b2-label" x="${TRACE.x}" y="${c.top - 10}">${c.label}</text>
              <text class="c-b2-rate" x="${TRACE.x + TRACE.w}" y="${c.top - 10}" text-anchor="end">${c.rate}</text>
              <path class="c-b2-trace" data-ch="${i}" stroke="${c.color}" />
              <circle class="c-b2-dot" data-ch="${i}" r="6" cx="${TRACE.x + TRACE.w}" fill="${c.color}" />`,
          ).join('')}
        </svg>
      </div>`,
    bounds: [SCOPE.x, SCOPE.y, SCOPE.x + SCOPE.w, SCOPE.y + SCOPE.h],
  },
  run(t, view) {
    CHANNELS.forEach((c, i) => {
      const on = isOn(t, c.half);
      view.part<Led>(c.led).value = on;
      if (on) c.wires.forEach((w) => view.glowWire(w, 1));
      view.q<SVGPathElement>(`.c-b2-trace[data-ch="${i}"]`).setAttribute('d', tracePath(t, c.half, c.top));
      view.q<SVGCircleElement>(`.c-b2-dot[data-ch="${i}"]`).setAttribute('cy', String(c.top + (on ? 0 : TRACE.swing)));
    });
  },
};

export default blinkTwoLeds;
