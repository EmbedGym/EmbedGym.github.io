import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';

// A fingertip rests on the sensor window. The hub turns the light it
// reflects into a pulse wave, and the sketch prints its heart rate and blood
// oxygen once a second. The pulse runs through the test's three readings,
// 72/98, 128/91 and 55/100, two seconds each; the heart and the wave keep the
// current rate.
export const DURATION = 6000;
const PHASES = [
  { from: 0, hr: 72, o2: 98 },
  { from: 2000, hr: 128, o2: 91 },
  { from: 4000, hr: 55, o2: 100 },
];
export const READS = [500, 1500, 2500, 3500, 4500, 5500];
const phaseAt = (t: number) => PHASES.findLast((p) => p.from <= (((t % DURATION) + DURATION) % DURATION))!;

// One loop's beats, each at the rate in force when it starts. Repeating them
// one loop earlier gives the trace its history at t=0, the same as at the end.
const LOOP_BEATS: number[] = [];
for (let b = 0; b < DURATION; b += 60000 / phaseAt(b).hr) LOOP_BEATS.push(b);
export const BEATS = [...LOOP_BEATS.map((b) => b - DURATION), ...LOOP_BEATS];

/** A pulse-oximeter wave: a sharp rise, a peak, the dicrotic notch, then the slow fall. */
export function wave(t: number): number {
  let v = 0;
  for (const b of BEATS) {
    const s = (t - b) / 1000;
    if (s < 0 || s > 0.9) continue;
    v += Math.exp(-(((s - 0.12) / 0.06) ** 2)) + 0.35 * Math.exp(-(((s - 0.33) / 0.08) ** 2));
  }
  return v;
}

const LOOP_PRINTS: Print[] = READS.map((t) => {
  const { hr, o2 } = phaseAt(t);
  // Each line wraps once, after the comma.
  return { t: t + 25, text: `HR:&nbsp;${hr}&nbsp;bpm, SpO2:&nbsp;${o2}` };
});
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
// Six rows of 26 px text: 34 + 6 × 35.36 + 10.
const PANEL = { x: -270, y: -100, w: 230, h: 257 };

const SCOPE = { x: 20, y: -150, w: 196, h: 104 };
const TRACE = { x: 50, w: 134, top: 30, swing: 56 };
export const WINDOW = 2000;
// The sensor window on the module, relative to its box.
export const WINDOW_AT = { dx: 31, dy: 65 };

/** The pulse trace's path over the last `WINDOW` ms, in a box `w` wide, from `top` down `swing` px, starting at `x`. */
export function tracePath(t: number, { x, w, top, swing }: { x: number; w: number; top: number; swing: number }): string {
  let d = '';
  for (let k = 0; k <= 60; k++) {
    const ms = t - WINDOW + (WINDOW * k) / 60;
    const y = top + swing * (1 - clamp(wave(ms) / 1.05));
    d += `${k ? 'L' : 'M'} ${x + (w * k) / 60} ${y} `;
  }
  return d;
}

/** The heart's size: a swell peaking with each beat's wave, smooth across the loop seam. */
export function heartScale(t: number): number {
  let s = 0;
  for (const b of [...BEATS, ...BEATS.map((x) => x + 2 * DURATION)]) s += Math.exp(-(((t - b - 120) / 90) ** 2));
  return 1 + 0.25 * Math.min(1, s);
}

const spo2HrRead: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-ox-scope {
          position: absolute; left: ${SCOPE.x}px; top: ${SCOPE.y}px; width: ${SCOPE.w}px; height: ${SCOPE.h}px;
          box-sizing: border-box; border-radius: 12px; background: #f8fafc; border: 1.5px solid #cfd6df;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-ox-trace { fill: none; stroke: #dc2626; stroke-width: 3.5; stroke-linejoin: round; }
        .c-ox-heart { position: absolute; left: 8px; top: 28px; font: 32px/1 var(--sans); color: #dc2626; transform-origin: 50% 60%; }
      </style>
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega, wrap: true, fontSize: 26 })}
      <div class="c-ox-scope">
        <div class="c-ox-heart">♥</div>
        <svg width="${SCOPE.w}" height="${SCOPE.h}" style="position:absolute;left:0;top:0"><path class="c-ox-trace" /></svg>
      </div>
      ${finger('f', { rotate: 180 })}`,
    bounds: [PANEL.x, SCOPE.y, SCOPE.x + SCOPE.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-20-SDA', 'w-21-SCL'], at: READS }],
  run(t, view) {
    // The finger lies flat from below, its pad on the sensor window.
    const box = view.box('BIO1');
    const pad = { x: box.x + WINDOW_AT.dx, y: box.y + WINDOW_AT.dy };
    pressFinger(view, 'f', t, pad, [[-1, Infinity]]);

    view.q<SVGPathElement>('.c-ox-trace').setAttribute('d', tracePath(t, TRACE));

    view.q<HTMLElement>('.c-ox-heart').style.transform = `scale(${heartScale(t)})`;

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default spo2HrRead;
