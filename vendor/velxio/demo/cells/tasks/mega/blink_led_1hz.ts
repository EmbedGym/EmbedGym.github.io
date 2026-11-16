import type { Cell } from '../../cell';

type Led = HTMLElement & { value: boolean };

// The sketch: HIGH for 500 ms, LOW for 500 ms, starting HIGH.
export const isOn = (t: number) => t % 1000 < 500;

// A logic-analyser strip of pin 3: the last WINDOW ms, newest at the right.
const SCOPE = { x: -124, y: -118, w: 210, h: 112 };
export const TRACE = { x: 18, w: 174, hi: 54, lo: 92 };
const WINDOW = 2000;

export function tracePath(t: number) {
  const px = (ms: number) => TRACE.x + TRACE.w * (1 - (t - ms) / WINDOW);
  const level = (ms: number) => (isOn(((ms % 1000) + 1000) % 1000) ? TRACE.hi : TRACE.lo);
  let ms = t - WINDOW;
  let d = `M ${px(ms)} ${level(ms)}`;
  while (true) {
    const edge = Math.floor(ms / 500) * 500 + 500;
    if (edge > t) break;
    d += ` H ${px(edge)} V ${level(edge)}`;
    ms = edge;
  }
  return `${d} H ${px(t)}`;
}

const blinkLed1hz: Cell = {
  duration: 4000,
  decor: {
    html: `
      <style>
        .c-b1-scope {
          position: absolute; left: ${SCOPE.x}px; top: ${SCOPE.y}px; width: ${SCOPE.w}px; height: ${SCOPE.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-b1-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-b1-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-b1-grid { stroke: #e8ebf0; stroke-width: 1.5; }
        .c-b1-trace { fill: none; stroke: #00aa00; stroke-width: 4; stroke-linejoin: round; }
        .c-b1-dot { fill: #00aa00; }
      </style>
      <div class="c-b1-scope">
        <div class="c-b1-head"><span>Pin 3</span><span>1 Hz</span></div>
        <svg width="${SCOPE.w}" height="${SCOPE.h}" style="position:absolute;left:0;top:0">
          <line class="c-b1-grid" x1="${TRACE.x}" x2="${TRACE.x + TRACE.w}" y1="${TRACE.hi}" y2="${TRACE.hi}" />
          <line class="c-b1-grid" x1="${TRACE.x}" x2="${TRACE.x + TRACE.w}" y1="${TRACE.lo}" y2="${TRACE.lo}" />
          <path class="c-b1-trace" />
          <circle class="c-b1-dot" r="6" cx="${TRACE.x + TRACE.w}" />
        </svg>
      </div>`,
    bounds: [SCOPE.x, SCOPE.y, SCOPE.x + SCOPE.w, SCOPE.y + SCOPE.h],
  },
  run(t, view) {
    const on = isOn(t);
    view.part<Led>('L1').value = on;
    if (on) {
      view.glowWire('w-3-R1', 1);
      view.glowWire('w-R1-L1', 1);
    }
    view.q<SVGPathElement>('.c-b1-trace').setAttribute('d', tracePath(t));
    view.q<SVGCircleElement>('.c-b1-dot').setAttribute('cy', String(on ? TRACE.hi : TRACE.lo));
  },
};

export default blinkLed1hz;
