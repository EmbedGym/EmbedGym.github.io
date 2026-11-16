import type { Cell } from '../../cell';
import { pwmPath, WAVE } from '../mega/breathing_led';

type Led = HTMLElement & { value: boolean; brightness: number };

const PIN_LABEL = 'PWM GPIO 10';
const SIGNAL_WIRES = ['w-10-R1', 'w-R1-L1'];

// main.c's esp_timer steps the LEDC duty every 10 ms: level 1 … 50, 50 … 1
// (each end is written twice), so one breath is 100 steps (1 s). The loop is four breaths.
const STEP = 10;
const BREATH = 100 * STEP;

function dutyAt(t: number) {
  const k = Math.floor(t / STEP) % 100;
  return (k <= 49 ? k + 1 : 100 - k) / 50;
}

// A PWM scope, left of the LED.
const PANEL = { x: -372, y: 182, w: 260, h: 114 };

const breathingLedEsp32s3: Cell = {
  duration: 4 * BREATH,
  decor: {
    html: `
      <style>
        .c-bre-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-bre-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-bre-duty { font-family: var(--mono); font-weight: 400; color: var(--muted); }
        .c-bre-grid { stroke: #e8ebf0; stroke-width: 1.5; }
        .c-bre-wave { fill: none; stroke: #00aa00; stroke-width: 3.5; stroke-linejoin: round; }
      </style>
      <div class="c-bre-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-bre-head"><span>${PIN_LABEL}</span><span class="c-bre-duty"></span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <line class="c-bre-grid" x1="${WAVE.x}" x2="${WAVE.x + WAVE.w}" y1="${WAVE.hi}" y2="${WAVE.hi}" />
          <line class="c-bre-grid" x1="${WAVE.x}" x2="${WAVE.x + WAVE.w}" y1="${WAVE.lo}" y2="${WAVE.lo}" />
          <path class="c-bre-wave" />
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
    view.q<SVGPathElement>('.c-bre-wave').setAttribute('d', pwmPath(duty));
    view.q<HTMLElement>('.c-bre-duty').textContent = `${Math.round(duty * 100)}%`.padStart(4, ' ');
  },
};

export default breathingLedEsp32s3;
