import type { Cell } from '../../cell';
import { pwmPath, WAVE } from '../mega/breathing_led';

type Led = HTMLElement & { value: boolean; brightness: number };

const PIN_LABEL = 'PWM P1.15';
const SIGNAL_WIRES = ['w-P115-R1', 'w-R1-L1'];

// main.c sets the PWM pulse every 10 ms: level 1 … 50, then 49 … 1 (duty
// level/50), so one breath is 99 steps (990 ms). The loop is four breaths.
const STEP = 10;
const BREATH = 99 * STEP;

function dutyAt(t: number) {
  const k = Math.floor(t / STEP) % 99;
  return (k <= 49 ? k + 1 : 99 - k) / 50;
}

// A PWM scope, left of the LED above the board.
const PANEL = { x: -271, y: -100, w: 260, h: 114 };

const breathingLedNrf52840: Cell = {
  duration: 4 * BREATH,
  decor: {
    html: `
      <style>
        .c-brn-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-brn-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-brn-duty { font-family: var(--mono); font-weight: 400; color: var(--muted); }
        .c-brn-grid { stroke: #e8ebf0; stroke-width: 1.5; }
        .c-brn-wave { fill: none; stroke: #00aa00; stroke-width: 3.5; stroke-linejoin: round; }
      </style>
      <div class="c-brn-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-brn-head"><span>${PIN_LABEL}</span><span class="c-brn-duty"></span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <line class="c-brn-grid" x1="${WAVE.x}" x2="${WAVE.x + WAVE.w}" y1="${WAVE.hi}" y2="${WAVE.hi}" />
          <line class="c-brn-grid" x1="${WAVE.x}" x2="${WAVE.x + WAVE.w}" y1="${WAVE.lo}" y2="${WAVE.lo}" />
          <path class="c-brn-wave" />
        </svg>
      </div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const duty = dutyAt(t);
    const led = view.part<Led>('L1');
    led.value = true;
    led.brightness = duty;
    for (const id of SIGNAL_WIRES) view.glowWire(id, duty);
    view.q<SVGPathElement>('.c-brn-wave').setAttribute('d', pwmPath(duty));
    view.q<HTMLElement>('.c-brn-duty').textContent = `${Math.round(duty * 100)}%`.padStart(4, ' ');
  },
};

export default breathingLedNrf52840;
