import type { Cell, CellView } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';

export const DURATION = 4000;
export const PRESSES: [number, number][] = [
  [500, 1400],
  [2300, 2800],
];
// The sketch calls tone(13, 1000) whenever pin 2 reads HIGH and noTone() otherwise.
export const TONES = PRESSES;
export const within = (ms: number, spans: [number, number][]) => {
  const m = ((ms % DURATION) + DURATION) % DURATION;
  return spans.some(([a, b]) => m >= a && m < b);
};

// Two scrolling logic traces, the last WINDOW ms, newest at the right.
export const SCOPE = { x: -150, y: -178, w: 240, h: 172 };
const TRACE = { x: 16, w: 208, swing: 26 };
const WINDOW = 2000;
const ROWS = [
  { note: 'button', top: 46, spans: PRESSES, color: '#00aa00', tone: false },
  { note: '1 kHz', top: 120, spans: TONES, color: '#0066ff', tone: true },
];

function rowPath(t: number, row: (typeof ROWS)[number]) {
  const px = (ms: number) => TRACE.x + TRACE.w * (1 - (t - ms) / WINDOW);
  const y = (high: boolean) => row.top + (high ? 0 : TRACE.swing);
  let d = `M ${px(t - WINDOW)} ${y(within(t - WINDOW, row.spans))}`;
  let band = '';
  // Walk the span edges inside the window, one loop back and this one.
  const edges = [-DURATION, 0]
    .flatMap((base) => row.spans.flatMap(([a, b]) => [base + a, base + b]))
    .filter((e) => e > t - WINDOW && e <= t)
    .sort((a, b) => a - b);
  for (const e of edges) d += ` H ${px(e)} V ${y(within(e, row.spans))}`;
  d += ` H ${px(t)}`;
  if (row.tone) {
    // A 1 kHz square wave is too dense to draw at this scale: show it as a hatched band.
    for (const base of [-DURATION, 0]) {
      for (const [a, b] of row.spans) {
        const x0 = px(Math.max(base + a, t - WINDOW));
        const x1 = px(Math.min(base + b, t));
        if (x1 > x0) band += `<rect x="${x0}" y="${row.top}" width="${x1 - x0}" height="${TRACE.swing}" />`;
      }
    }
    d = `M ${TRACE.x} ${y(false)} H ${px(t)}`;
  }
  return { d, band };
}

/**
 * The two-trace scope's markup at `at` (cell coordinates), classes prefixed `p`
 * (e.g. `c-bd`), its rows labelled with the button's and the buzzer's pins.
 * `size` scales the whole panel, text included, for a card drawn at a low scale.
 */
export function scopeHtml(p: string, pins: [string, string], at: { x: number; y: number }, font = 20, size = 1) {
  return `
      <style>
        .${p}-scope {
          position: absolute; left: ${at.x}px; top: ${at.y}px; width: ${SCOPE.w * size}px; height: ${SCOPE.h * size}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .${p}-label { font-family: var(--mono); font-size: ${font}px; fill: var(--ink); }
        .${p}-note { font-family: var(--mono); font-size: ${font}px; fill: var(--muted); }
        .${p}-trace { fill: none; stroke-width: 3.5; stroke-linejoin: round; }
        .${p}-band { fill: url(#${p}-hatch); }
      </style>
      <div class="${p}-scope">
        <svg width="${SCOPE.w * size}" height="${SCOPE.h * size}"${size === 1 ? '' : ` viewBox="0 0 ${SCOPE.w} ${SCOPE.h}"`} style="position:absolute;left:0;top:0">
          <defs>
            <pattern id="${p}-hatch" width="5" height="10" patternUnits="userSpaceOnUse">
              <rect width="5" height="10" fill="#dbe7ff" />
              <rect width="2.5" height="10" fill="#0066ff" />
            </pattern>
          </defs>
          ${ROWS.map(
            (r, i) => `
              <text class="${p}-label" x="${TRACE.x}" y="${r.top - 10}">${pins[i]}</text>
              <text class="${p}-note" x="${TRACE.x + TRACE.w}" y="${r.top - 10}" text-anchor="end">${r.note}</text>
              <g class="${p}-band" data-row="${i}"></g>
              <path class="${p}-trace" data-row="${i}" stroke="${r.color}" />`,
          ).join('')}
        </svg>
      </div>`;
}

/** Scrolls the scope's two traces to `t`. */
export function runScope(view: CellView, p: string, t: number) {
  ROWS.forEach((row, i) => {
    const { d, band } = rowPath(t, row);
    view.q<SVGPathElement>(`.${p}-trace[data-row="${i}"]`).setAttribute('d', d);
    view.q<SVGGElement>(`.${p}-band[data-row="${i}"]`).innerHTML = band;
  });
}

export const toneAt = (t: number) => TONES.find(([a, b]) => t >= a && t < b);

const buzzerDoorbell: Cell = {
  duration: DURATION,
  decor: {
    html: `${scopeHtml('c-bd', ['pin 2', 'pin 13'], SCOPE)}
      ${sound('buz')}
      ${finger('f')}`,
    bounds: [SCOPE.x, -200, SCOPE.x + SCOPE.w, SCOPE.y + SCOPE.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }
    const sounding = within(t, TONES);
    if (sounding) view.glowWire('w-13-BUZ', 1);

    runScope(view, 'c-bd', t);

    // Sound rings rise from the buzzer over the GND rail, one every 200 ms while it sounds.
    const buz = view.box('BUZ');
    const tone = toneAt(t);
    setSound(view, 'buz', { x: buz.x + buz.w / 2, y: buz.y + 38 }, tone ? (t - tone[0]) / 200 : null, { from: 66, to: 116 });
  },
};

export default buzzerDoorbell;
