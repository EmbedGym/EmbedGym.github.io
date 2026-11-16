import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { moon, setMoon, setSun, sun } from '../../decor/sky';
import { darkness, DURATION } from '../mega/photoresistor_nightlight';

type Led = HTMLElement & { value: boolean };

// main.c reads P0.03 (AIN1, gain 1/6: 0–3600 mV) every 50 ms, converts it to mV and
// lights P1.15 while it is above 2250 mV. The sensor runs from VDD (3.3 V).
const ADC_PIN = 'P0.03';
const LED_LABEL = 'LED P1.15';
const SENSOR_WIRE = 'w-P0.03-S';
const LED_WIRES = ['w-P1.15-R1', 'w-R1-L1'];
const FULL_SCALE = 3600;
const THRESHOLD = 2250;
const BRIGHT = 580;
const DARK = 2840;

const readingAt = (t: number) => Math.round(lerp(BRIGHT, DARK, darkness(t)));

const PANEL = { x: -442, y: 70, w: 430, h: 196 };
const BAR = { x: 16, y: 70, w: 398, h: 24 };
const barX = (v: number) => BAR.x + (BAR.w * v) / FULL_SCALE;
// The sun/moon sits right of the sensor, under the board's bottom edge; the panel left of the board (the nearer side).
const SKY = { x: 330, y: 286 };
const SKY_SCALE = 0.75;

const photoresistorNightlightNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-pnn-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-pnn-head { position: absolute; left: 16px; right: 16px; top: 12px; display: flex; justify-content: space-between;
          font-size: 29px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-pnn-val { font-family: var(--mono); color: #0066ff; }
        .c-pnn-track { fill: #f1f3f6; stroke: #e2e6ec; stroke-width: 1.5; }
        .c-pnn-fill { fill: #0066ff; }
        .c-pnn-thr { stroke: var(--warn); stroke-width: 3; }
        .c-pnn-tick { font-family: var(--mono); font-size: 29px; fill: var(--warn); }
        .c-pnn-led { font-family: var(--mono); font-size: 29px; fill: var(--muted); }
        .c-pnn-led.on { fill: #d32f2f; font-weight: 700; }
      </style>
      <div class="c-pnn-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-pnn-head"><span>${ADC_PIN} ↑ = darker</span><span class="c-pnn-val"></span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <rect class="c-pnn-track" x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="6" />
          <rect class="c-pnn-fill" x="${BAR.x}" y="${BAR.y}" height="${BAR.h}" rx="6" />
          <line class="c-pnn-thr" x1="${barX(THRESHOLD)}" x2="${barX(THRESHOLD)}" y1="${BAR.y - 8}" y2="${BAR.y + BAR.h + 8}" />
          <text class="c-pnn-tick" x="${PANEL.w - 16}" y="${BAR.y + BAR.h + 38}" text-anchor="end">threshold ${THRESHOLD} mV</text>
          <text class="c-pnn-led" x="${BAR.x}" y="${PANEL.h - 16}"></text>
        </svg>
      </div>
      ${sun('sun', { scale: SKY_SCALE })}${moon('moon', { scale: SKY_SCALE })}`,
    bounds: [PANEL.x, PANEL.y, SKY.x + 35, SKY.y + 41],
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
    view.q<HTMLElement>('.c-pnn-val').textContent = `${reading} mV`;
    view.q<SVGRectElement>('.c-pnn-fill').setAttribute('width', String(barX(reading) - BAR.x));
    const led = view.q<SVGTextElement>('.c-pnn-led');
    led.textContent = `${LED_LABEL}: ${ledOn ? 'ON' : 'off'}`;
    led.classList.toggle('on', ledOn);

    setSun(view, 'sun', { x: SKY.x, y: SKY.y + 12 * dark }, { turn: (t / DURATION) * 45, opacity: clamp(1 - 2 * dark) });
    setMoon(view, 'moon', { x: SKY.x, y: SKY.y + 12 * (1 - dark) }, clamp(2 * dark - 1));
  },
};

export default photoresistorNightlightNrf52840;
