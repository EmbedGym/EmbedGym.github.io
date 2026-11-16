import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { moon, setMoon, setSun, sun } from '../../decor/sky';

type Led = HTMLElement & { value: boolean };

// Daylight fades to night and back. KY-018 reads higher in the dark; the sketch
// polls A2 every 50 ms and lights pin 3 while the reading is above 700.
export const DURATION = 5000;
const BRIGHT = 180;
const DARK = 880;
const THRESHOLD = 700;

export function darkness(t: number) {
  if (t < 600) return 0;
  if (t < 1600) return easeInOutCubic((t - 600) / 1000);
  if (t < 3200) return 1;
  if (t < 4200) return 1 - easeInOutCubic((t - 3200) / 1000);
  return 0;
}
const readingAt = (t: number) => Math.round(lerp(BRIGHT, DARK, darkness(t)));

const PANEL = { x: 404, y: -60, w: 270, h: 168 };
const BAR = { x: 16, y: 62, w: 238, h: 22 };
const barX = (v: number) => BAR.x + (BAR.w * v) / 1023;
// The sun/moon sits right of the sensor and its GND wire; the panel right of the board.
const SKY = { x: 434, y: 214 };

const photoresistorNightlight: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-pn-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-pn-head { position: absolute; left: 16px; right: 16px; top: 12px; display: flex; justify-content: space-between;
          font-size: 24px; font-weight: 700; color: var(--ink); }
        .c-pn-val { font-family: var(--mono); color: #0066ff; }
        .c-pn-track { fill: #f1f3f6; stroke: #e2e6ec; stroke-width: 1.5; }
        .c-pn-fill { fill: #0066ff; }
        .c-pn-thr { stroke: var(--warn); stroke-width: 3; }
        .c-pn-tick { font-family: var(--mono); font-size: 24px; fill: var(--warn); }
        .c-pn-led { font-family: var(--mono); font-size: 24px; fill: var(--muted); }
        .c-pn-led.on { fill: #d32f2f; font-weight: 700; }
      </style>
      <div class="c-pn-panel">
        <div class="c-pn-head"><span>A2 ↑ = darker</span><span class="c-pn-val"></span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <rect class="c-pn-track" x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="6" />
          <rect class="c-pn-fill" x="${BAR.x}" y="${BAR.y}" height="${BAR.h}" rx="6" />
          <line class="c-pn-thr" x1="${barX(THRESHOLD)}" x2="${barX(THRESHOLD)}" y1="${BAR.y - 8}" y2="${BAR.y + BAR.h + 8}" />
          <text class="c-pn-tick" x="${PANEL.w - 16}" y="${BAR.y + BAR.h + 32}" text-anchor="end">threshold 700</text>
          <text class="c-pn-led" x="${BAR.x}" y="${PANEL.h - 16}"></text>
        </svg>
      </div>
      ${sun('sun', { scale: 1.15 })}${moon('moon')}`,
    bounds: [SKY.x - 60, PANEL.y, PANEL.x + PANEL.w, SKY.y + 60],
  },
  run(t, view) {
    const dark = darkness(t);
    // The sketch acts on the reading it took at the last 50 ms poll.
    const polled = readingAt(Math.floor(t / 50) * 50);
    const ledOn = polled > THRESHOLD;
    view.part<Led>('L1').value = ledOn;
    if (ledOn) {
      view.glowWire('w-3-R1', 1);
      view.glowWire('w-R1-L1', 1);
    }
    view.glowWire('w-A2-S', clamp(dark));

    const reading = readingAt(t);
    view.q<HTMLElement>('.c-pn-val').textContent = String(reading);
    view.q<SVGRectElement>('.c-pn-fill').setAttribute('width', String(barX(reading) - BAR.x));
    const led = view.q<SVGTextElement>('.c-pn-led');
    led.textContent = ledOn ? 'LED pin 3: ON' : 'LED pin 3: off';
    led.classList.toggle('on', ledOn);

    setSun(view, 'sun', { x: SKY.x, y: SKY.y + 12 * dark }, { turn: (t / DURATION) * 45, opacity: clamp(1 - 2 * dark) });
    setMoon(view, 'moon', { x: SKY.x, y: SKY.y + 12 * (1 - dark) }, clamp(2 * dark - 1));
  },
};

export default photoresistorNightlight;
