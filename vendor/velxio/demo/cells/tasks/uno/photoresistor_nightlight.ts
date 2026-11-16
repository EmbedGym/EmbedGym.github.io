import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { moon, setMoon, setSun, sun } from '../../decor/sky';
import { darkness, DURATION } from '../mega/photoresistor_nightlight';

type Led = HTMLElement & { value: boolean };

// The sketch polls A2 every 50 ms and lights pin 3 while the reading is above 700.
const ADC_PIN = 'A2';
const LED_LABEL = 'LED pin 3';
const SENSOR_WIRE = 'w-A2-S';
const LED_WIRES = ['w-3-R1', 'w-R1-L1'];
const FULL_SCALE = 1023;
const THRESHOLD = 700;
const BRIGHT = 180;
const DARK = 880;

const readingAt = (t: number) => Math.round(lerp(BRIGHT, DARK, darkness(t)));

const PANEL = { x: 290, y: -50, w: 270, h: 168 };
const BAR = { x: 16, y: 62, w: 238, h: 22 };
const barX = (v: number) => BAR.x + (BAR.w * v) / FULL_SCALE;
// The sun/moon sits right of the sensor, below the panel.
const SKY = { x: 364, y: 225 };

const photoresistorNightlightUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-pnu-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-pnu-head { position: absolute; left: 16px; right: 16px; top: 12px; display: flex; justify-content: space-between;
          font-size: 24px; font-weight: 700; color: var(--ink); }
        .c-pnu-val { font-family: var(--mono); color: #0066ff; }
        .c-pnu-track { fill: #f1f3f6; stroke: #e2e6ec; stroke-width: 1.5; }
        .c-pnu-fill { fill: #0066ff; }
        .c-pnu-thr { stroke: var(--warn); stroke-width: 3; }
        .c-pnu-tick { font-family: var(--mono); font-size: 24px; fill: var(--warn); }
        .c-pnu-led { font-family: var(--mono); font-size: 24px; fill: var(--muted); }
        .c-pnu-led.on { fill: #d32f2f; font-weight: 700; }
      </style>
      <div class="c-pnu-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-pnu-head"><span>${ADC_PIN} ↑ = darker</span><span class="c-pnu-val"></span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <rect class="c-pnu-track" x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="6" />
          <rect class="c-pnu-fill" x="${BAR.x}" y="${BAR.y}" height="${BAR.h}" rx="6" />
          <line class="c-pnu-thr" x1="${barX(THRESHOLD)}" x2="${barX(THRESHOLD)}" y1="${BAR.y - 8}" y2="${BAR.y + BAR.h + 8}" />
          <text class="c-pnu-tick" x="${PANEL.w - 16}" y="${BAR.y + BAR.h + 32}" text-anchor="end">threshold ${THRESHOLD}</text>
          <text class="c-pnu-led" x="${BAR.x}" y="${PANEL.h - 16}"></text>
        </svg>
      </div>
      ${sun('sun')}${moon('moon')}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, SKY.y + 52],
  },
  run(t, view) {
    const dark = darkness(t);
    // The sketch acts on the reading it took at the last 50 ms poll.
    const polled = readingAt(Math.floor(t / 50) * 50);
    const ledOn = polled > THRESHOLD;
    view.part<Led>('L1').value = ledOn;
    if (ledOn) for (const id of LED_WIRES) view.glowWire(id, 1);
    view.glowWire(SENSOR_WIRE, clamp(dark));

    const reading = readingAt(t);
    view.q<HTMLElement>('.c-pnu-val').textContent = String(reading);
    view.q<SVGRectElement>('.c-pnu-fill').setAttribute('width', String(barX(reading) - BAR.x));
    const led = view.q<SVGTextElement>('.c-pnu-led');
    led.textContent = `${LED_LABEL}: ${ledOn ? 'ON' : 'off'}`;
    led.classList.toggle('on', ledOn);

    setSun(view, 'sun', { x: SKY.x, y: SKY.y + 12 * dark }, { turn: (t / DURATION) * 45, opacity: clamp(1 - 2 * dark) });
    setMoon(view, 'moon', { x: SKY.x, y: SKY.y + 12 * (1 - dark) }, clamp(2 * dark - 1));
  },
};

export default photoresistorNightlightUno;
