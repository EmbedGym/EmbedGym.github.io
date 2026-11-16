import type { Cell } from '../../cell';

type Led = HTMLElement & { value: boolean; brightness: number };

// The sketch steps the PWM level every 10 ms: 2 %, 4 %, … 100 %, then back
// down to 2 %, so one breath is 98 steps (980 ms). The loop is four breaths.
const STEP = 10;
const BREATH = 98 * STEP;

function dutyAt(t: number) {
  const k = Math.floor(t / STEP) % 98;
  const level = k <= 49 ? k + 1 : 99 - k;
  return level / 50;
}

// A PWM scope: three periods of the 490 Hz carrier at the current duty.
const PANEL = { x: -176, y: -124, w: 260, h: 114 };
export const WAVE = { x: 18, w: 224, hi: 56, lo: 92 };

export function pwmPath(duty: number) {
  if (duty >= 1) return `M ${WAVE.x} ${WAVE.lo} V ${WAVE.hi} H ${WAVE.x + WAVE.w}`;
  const period = WAVE.w / 3;
  let d = `M ${WAVE.x} ${WAVE.lo}`;
  for (let p = 0; p < 3; p++) {
    const x0 = WAVE.x + p * period;
    d += ` H ${x0} V ${WAVE.hi} H ${x0 + period * duty} V ${WAVE.lo}`;
  }
  return `${d} H ${WAVE.x + WAVE.w}`;
}

const breathingLed: Cell = {
  duration: 4 * BREATH,
  decor: {
    html: `
      <style>
        .c-br-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-br-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-br-duty { font-family: var(--mono); font-weight: 400; color: var(--muted); }
        .c-br-grid { stroke: #e8ebf0; stroke-width: 1.5; }
        .c-br-wave { fill: none; stroke: #00aa00; stroke-width: 3.5; stroke-linejoin: round; }
      </style>
      <div class="c-br-panel">
        <div class="c-br-head"><span>PWM pin 3</span><span class="c-br-duty"></span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <line class="c-br-grid" x1="${WAVE.x}" x2="${WAVE.x + WAVE.w}" y1="${WAVE.hi}" y2="${WAVE.hi}" />
          <line class="c-br-grid" x1="${WAVE.x}" x2="${WAVE.x + WAVE.w}" y1="${WAVE.lo}" y2="${WAVE.lo}" />
          <path class="c-br-wave" />
        </svg>
      </div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const duty = dutyAt(t);
    const led = view.part<Led>('L1');
    led.value = true;
    led.brightness = duty;
    view.glowWire('w-3-R1', duty);
    view.glowWire('w-R1-L1', duty);
    view.q<SVGPathElement>('.c-br-wave').setAttribute('d', pwmPath(duty));
    view.q<HTMLElement>('.c-br-duty').textContent = `${Math.round(duty * 100)}%`.padStart(4, ' ');
  },
};

export default breathingLed;
