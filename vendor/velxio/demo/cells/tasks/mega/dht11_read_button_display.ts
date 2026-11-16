import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// The room warms and turns humid, a press reads the DHT11 onto the LCD; it cools
// back and a second press shows the cool reading again, which the loop starts on.
export const DURATION = 5600;
export const COOL = { t: 19, h: 41 };
export const WARM = { t: 28, h: 66 };
const WARMING: [number, number] = [400, 1300];
const COOLING: [number, number] = [2700, 3600];
export const PRESSES: [number, number][] = [
  [1800, 2050],
  [4200, 4450],
];
// The interrupt sets a flag; loop() reads the sensor (about 25 ms) and rewrites both rows.
export const SHOWN = PRESSES.map(([down]) => down + 30);

export function airAt(t: number) {
  const warm = progress(t, WARMING[0], WARMING[1] - WARMING[0]) - progress(t, COOLING[0], COOLING[1] - COOLING[0]);
  const k = easeInOutCubic(warm);
  return { t: lerp(COOL.t, WARM.t, k), h: lerp(COOL.h, WARM.h, k), k };
}

const row = (s: string) => s.padEnd(16, ' ');
export const screen = (r: { t: number; h: number }) => row(`Temp: ${r.t.toFixed(1)}C`) + row(`RH: ${r.h.toFixed(1)}%`);

// Cell coordinates: the DHT11 spans x 450..534, the resistor's GND lane x 545.
const BADGE = { x: 560, y: 70, w: 150, h: 76 };

const dhtButtonDisplay: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dht-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 28px/1.15 var(--mono);
        }
        .c-dht-air span { color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6); }
      </style>
      <div class="c-dht-air"><span class="c-dht-t"></span><span class="c-dht-h"></span></div>
      ${finger('f')}`,
    bounds: [BADGE.x, -160, BADGE.x + BADGE.w, BADGE.y + BADGE.h],
  },
  run(t, view) {
    const air = airAt(t);
    const badge = view.q<HTMLElement>('.c-dht-air');
    badge.style.setProperty('--k', String(air.k));
    view.q<HTMLElement>('.c-dht-t').textContent = `${air.t.toFixed(0)}°C`;
    view.q<HTMLElement>('.c-dht-h').textContent = `${air.h.toFixed(0)}% RH`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }

    const lastShown = SHOWN.filter((s) => s <= t).length;
    view.part<Lcd>('LCD1').text = screen(lastShown === 1 ? WARM : COOL);
  },
  activity: [
    { wires: ['w-3-DATA'], at: PRESSES.map(([down]) => down + 5) },
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: SHOWN.map((s) => s - 3) },
  ],
};

export default dhtButtonDisplay;
