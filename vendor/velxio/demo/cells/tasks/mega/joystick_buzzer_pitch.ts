import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { setSound, sound } from '../../decor/sound';

// The stick moves up, then down, then back to centre. Every 100 ms the sketch
// reads VRy on A0 and retunes the buzzer: tone(3, map(y, 0, 1023, 200, 2000)).
export const DURATION = 4800;
export const MOVES = [
  { at: 400, len: 500, to: 1023 },
  { at: 1700, len: 700, to: 0 },
  { at: 3300, len: 600, to: 512 },
];

export function stickAt(t: number) {
  let v = 512;
  for (const m of MOVES) {
    if (t < m.at) break;
    v = lerp(v, m.to, easeInOutCubic(clamp((t - m.at) / m.len)));
  }
  return v;
}
export const freqOf = (y: number) => 200 + Math.floor((y * 1800) / 1023);
export const polledY = (t: number) => Math.round(stickAt(Math.floor(t / 100) * 100));

// Ring phase is the integral of the tone frequency, scaled so a whole number
// of rings leaves the buzzer per loop and the loop closes without a jump.
// `hzAt(t)` is the tone playing at t, constant over each 100 ms poll.
const STEP = 100;
const RING_RATE = 1 / 600_000;
export function ringPhaseFor(hzAt: (t: number) => number) {
  const total = Array.from({ length: DURATION / STEP }, (_, i) => hzAt(i * STEP) * STEP).reduce((a, b) => a + b, 0);
  const scale = Math.round(total * RING_RATE) / total;
  return (t: number) => {
    let sum = 0;
    for (let s = 0; s + STEP <= t; s += STEP) sum += hzAt(s) * STEP;
    sum += hzAt(t) * (t % STEP);
    return sum * scale;
  };
}
/**
 * Slides the KY-023 cap (the r 15 and r 11.6 circles; the gimbal dome stays) along the element's
 * y axis, 0..1 = VRy low..high. Turned 180°, +y inside the element is up on screen; turned 270°, right.
 */
export function setKnob(view: CellView, id: string, y01: number) {
  const dy = (y01 - 0.5) * 9;
  view.part<HTMLElement>(id).shadowRoot!.querySelectorAll('circle[r="15"], circle[r="11.6"]').forEach((c) => {
    c.setAttribute('transform', `translate(0 ${dy})`);
  });
}

const ringPhase = ringPhaseFor((t) => freqOf(polledY(t)));

/** Which way the stick is being pushed at t, if at all. */
export function pushDir(t: number): 'up' | 'down' | null {
  const m = MOVES.find((m) => t >= m.at && t < m.at + m.len);
  if (!m) return null;
  return m.to > stickAt(m.at) ? 'up' : 'down';
}

/** A square wave across `box` whose period on screen scales with 1/f. */
export function squareWave(hz: number, box: { x: number; y: number; w: number; h: number }) {
  const period = 16000 / hz;
  let d = `M ${box.x} ${box.y + box.h}`;
  for (let x = box.x; x < box.x + box.w; x += period) {
    const half = Math.min(x + period / 2, box.x + box.w);
    const end = Math.min(x + period, box.x + box.w);
    d += ` V ${box.y} H ${half} V ${box.y + box.h} H ${end}`;
  }
  return d;
}

const PANEL = { x: 414, y: -6, w: 270, h: 132 };
const WAVE = { x: 16, y: 84, w: 238, h: 32 };
const RINGS = 3;
const ARROW = { x: 304, y: 252 };

const joystickBuzzerPitch: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-jp-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-jp-row { position: absolute; left: 16px; right: 16px; display: flex; justify-content: space-between;
          font-size: 24px; color: var(--ink); }
        .c-jp-row b { font-family: var(--mono); }
        .c-jp-y { color: #0066ff; }
        .c-jp-hz { color: #00aa00; }
        .c-jp-wave { fill: none; stroke: #00aa00; stroke-width: 2.5; stroke-linejoin: round; }
        .c-jp-arrow { fill: none; stroke: var(--muted); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
        .c-jp-arrow.on { stroke: var(--accent); }
      </style>
      <div class="c-jp-panel">
        <div class="c-jp-row" style="top:10px"><span>A0 (VRy)</span><b class="c-jp-y"></b></div>
        <div class="c-jp-row" style="top:42px"><span>tone pin 3</span><b class="c-jp-hz"></b></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <path class="c-jp-wave" />
        </svg>
      </div>
      <svg class="cell-air" viewBox="0 0 10 10">
        <path class="c-jp-arrow" data-dir="up" d="M ${ARROW.x} ${ARROW.y + 24} V ${ARROW.y} M ${ARROW.x - 10} ${ARROW.y + 10} L ${ARROW.x} ${ARROW.y} L ${ARROW.x + 10} ${ARROW.y + 10}" />
        <path class="c-jp-arrow" data-dir="down" d="M ${ARROW.x} ${ARROW.y + 38} V ${ARROW.y + 62} M ${ARROW.x - 10} ${ARROW.y + 52} L ${ARROW.x} ${ARROW.y + 62} L ${ARROW.x + 10} ${ARROW.y + 52}" />
      </svg>
      ${sound('buz')}`,
    bounds: [ARROW.x - 12, PANEL.y, PANEL.x + PANEL.w, ARROW.y + 62],
  },
  run(t, view) {
    setKnob(view, 'JOY1', stickAt(t) / 1023);
    const dir = pushDir(t);
    view.qa<SVGPathElement>('.c-jp-arrow').forEach((a) => a.classList.toggle('on', a.dataset.dir === dir));

    const y = polledY(t);
    const hz = freqOf(y);
    view.glowWire('w-A0-VRy', 1);
    view.glowWire('w-3-BZ1', 1);
    view.q<HTMLElement>('.c-jp-y').textContent = String(y);
    view.q<HTMLElement>('.c-jp-hz').textContent = `${hz} Hz`;

    view.q<SVGPathElement>('.c-jp-wave').setAttribute('d', squareWave(hz, WAVE));

    // Sound rings leave the buzzer's free side, faster for a higher pitch.
    const buz = view.box('BZ1');
    setSound(view, 'buz', { x: buz.x + buz.w / 2, y: buz.y + buz.h / 2 - 4 }, RINGS * ringPhase(t), { dir: 'right', from: 50, to: 84, ongoing: true });
  },
};

export default joystickBuzzerPitch;
