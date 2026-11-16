import { easeInOutCubic, lerp } from '../../anim';
import type { Cell, Rect } from '../../cell';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';
import { ping, runPing } from '../../decor/ping';
import { setSound, sound, type SoundDir } from '../../decor/sound';

type Led = HTMLElement & { value: boolean; brightness: number };
type Buzzer = HTMLElement & { hasSignal: boolean };

// A wall closes in from 90 cm to 10 cm and backs off again. Every 100 ms the
// sketch pings and sets the LED to map(d, 0..100, 255..0) and the tone to
// map(d, 0..100, 2000..200) Hz.
const DURATION = 5000;
const FAR = 90;
const NEAR = 10;
const LOOP_MS = 100;

function distance(t: number) {
  if (t < 500) return FAR;
  if (t < 2000) return lerp(FAR, NEAR, easeInOutCubic((t - 500) / 1500));
  if (t < 2800) return NEAR;
  if (t < 4300) return lerp(NEAR, FAR, easeInOutCubic((t - 2800) / 1500));
  return FAR;
}
const mapRange = (x: number, a: number, b: number, c: number, d: number) => c + ((x - a) * (d - c)) / (b - a);

// Ring pulses per second follow the pitch (scaled down to be countable), tuned so a
// whole number of pulses fits the loop and it restarts in phase.
const hzAt = (tick: number) => mapRange(Math.round(distance(tick)), 0, 100, 2000, 200);
const RAW_RATE = Array.from({ length: DURATION / LOOP_MS }, (_, k) => hzAt(k * LOOP_MS) / 250);
const RAW_TOTAL = RAW_RATE.reduce((a, r) => a + (r * LOOP_MS) / 1000, 0);
const RING_RATE = RAW_RATE.map((r) => (r * Math.round(RAW_TOTAL)) / RAW_TOTAL);
const RING_PHASE = RING_RATE.map((_, k) => RING_RATE.slice(0, k).reduce((a, r) => a + (r * LOOP_MS) / 1000, 0));

const WALL = obstacleSize('wall');
const BAR_H = 14;

/** What differs between boards: wire ids, where the panel and the wall go, and the LED's duty maths. */
export interface ParkingBoard {
  /** Class prefix, unique per board's card. */
  prefix: string;
  trig: string;
  echo: string[];
  /** The LED's signal wires, which glow with its duty. */
  led: string[];
  buzzer: string;
  /** The edge the transducers face, cell coordinates: the top edge, with the wall above it, or with
   * `axis` set, the right edge of a module turned 90°, the wall standing on end to its right. */
  face: number;
  /** Facing right: the sensor's horizontal centre line, cell coordinates. */
  axis?: number;
  /** Which way the buzzer's rings travel (default right). */
  soundDir?: SoundDir;
  /** Keep the previous loop's rings out at t=0, since the tone never stops. */
  ongoing?: boolean;
  panel: Rect;
  /** Text size, px (default 24). */
  font?: number;
  /** LED duty 0..1 for a reading in cm, as the firmware computes it. */
  duty: (cm: number) => number;
  /** Decor x extent right of the panel, for the bounds. */
  right: number;
}

/** AVR map(d, 0, 100, 255, 0) and the ESP-IDF 255 - 255 * d / 100 (integer maths, the same). */
export const duty8 = (cm: number) => (255 - Math.trunc((255 * cm) / 100)) / 255;

export function parkingCell(b: ParkingBoard): Cell {
  const pk = b.prefix;
  const font = b.font ?? 24;
  const row = font * 1.5;
  // Rows: cm, Hz, Hz bar, LED %, LED bar.
  const rowTop = [8, 8 + row, 6 + 2 * row, 26 + 2 * row, 24 + 3 * row];
  const barW = b.panel.w - 32;
  const side = b.axis !== undefined;
  const gap = (d: number) => 12 + (40 * (d - NEAR)) / (FAR - NEAR);
  const wallBottom = (d: number) => b.face - gap(d);
  const pkTurn = `${pk}turn`;
  // Facing right, the wall stands on end: its wrapper turns a quarter, so the wall's own x runs down the card.
  const wall = side ? `<div class="${pkTurn}">${obstacle('wall', 'wall')}</div>` : obstacle('wall', 'wall');
  const top = side ? Math.min(b.panel.y, b.axis! - WALL.w / 2) : Math.min(b.panel.y, wallBottom(FAR) - WALL.h);
  const bottom = side ? Math.max(b.panel.y + b.panel.h, b.axis! + WALL.w / 2) : b.panel.y + b.panel.h;
  const right = side ? Math.max(b.right, b.face + gap(FAR) + WALL.h) : b.right;
  return {
    duration: DURATION,
    decor: {
      html: `
        <style>
          .${pk}panel {
            position: absolute; left: ${b.panel.x}px; top: ${b.panel.y}px; width: ${b.panel.w}px; height: ${b.panel.h}px;
            background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          }
          .${pk}row { position: absolute; left: 16px; right: 16px; font: 700 ${font}px var(--mono); color: var(--ink); white-space: nowrap; }
          .${pk}track { position: absolute; left: 16px; width: ${barW}px; height: ${BAR_H}px; border-radius: 5px; background: #f1f3f6; border: 1.5px solid #e2e6ec; overflow: hidden; }
          .${pk}fill { height: 100%; }
          .${pkTurn} { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: rotate(90deg); }
        </style>
        ${wall}
        <div class="${pk}panel">
          <div class="${pk}row" style="top:${rowTop[0]}px;color:#0066ff" data-k="cm"></div>
          <div class="${pk}row" style="top:${rowTop[1]}px" data-k="hz"></div>
          <div class="${pk}track" style="top:${rowTop[2]}px"><div class="${pk}fill" data-k="hzbar" style="background:#ffcc00"></div></div>
          <div class="${pk}row" style="top:${rowTop[3]}px" data-k="led"></div>
          <div class="${pk}track" style="top:${rowTop[4]}px"><div class="${pk}fill" data-k="ledbar" style="background:#e53935"></div></div>
        </div>
        ${ping('p')}${sound('buzz')}`,
      bounds: [b.panel.x, top, right, bottom],
    },
    run(t, view) {
      const d = distance(t);
      const sensor = view.box('US1');
      if (side) placeObstacle(view, 'wall', b.axis! - WALL.w / 2, -(b.face + gap(d)) - WALL.h);
      else placeObstacle(view, 'wall', sensor.x + sensor.w / 2 - WALL.w / 2, wallBottom(d) - WALL.h);
      view.q<HTMLElement>('[data-k="cm"]').textContent = `${Math.round(d)} cm`;

      // The sketch acts on its latest 100 ms ping.
      const tick = Math.floor(t / LOOP_MS) * LOOP_MS;
      const polled = Math.round(distance(tick));
      const duty = b.duty(polled);
      const hz = Math.round(hzAt(tick));
      const led = view.part<Led>('L1');
      led.value = true;
      led.brightness = duty;
      view.part<Buzzer>('BZ1').hasSignal = true;
      for (const w of b.led) view.glowWire(w, duty);
      view.glowWire(b.buzzer, 0.6);

      view.q<HTMLElement>('[data-k="hz"]').textContent = `${hz} Hz`;
      view.q<HTMLElement>('[data-k="hzbar"]').style.width = `${(100 * hz) / 2000}%`;
      view.q<HTMLElement>('[data-k="led"]').textContent = `LED ${Math.round(100 * duty)}%`;
      view.q<HTMLElement>('[data-k="ledbar"]').style.width = `${100 * duty}%`;

      const since = t - tick;
      view.glowWire(b.trig, since < 40 ? 1 : 0);
      for (const w of b.echo) view.glowWire(w, since > 20 && since < 20 + 2 * polled ? 1 : 0);
      // The transmit can is left as drawn; top on a module turned 90°.
      const tx = side ? { x: sensor.x + sensor.w * 0.6, y: sensor.y + sensor.h * 0.2 } : { x: sensor.x + sensor.w * 0.2, y: sensor.y + sensor.h * 0.4 };
      runPing(view, 'p', since, { tx, r: Math.min(sensor.w, sensor.h) * 0.33 });

      // Sound rings pulse out of the buzzer faster as the pitch rises (scaled down to be countable).
      const buzzer = view.box('BZ1');
      const k = Math.floor(t / LOOP_MS);
      const cycles = RING_PHASE[k] + (RING_RATE[k] * (t - k * LOOP_MS)) / 1000;
      setSound(view, 'buzz', { x: buzzer.x + buzzer.w / 2, y: buzzer.y + buzzer.w / 2 }, 2 * cycles, { dir: b.soundDir ?? 'right', from: 36, to: 76, ongoing: b.ongoing });
    },
  };
}

export default parkingCell({
  prefix: 'c-pk-',
  trig: 'w-9-TRIG',
  echo: ['w-10-ECHO'],
  led: ['w-3-R1', 'w-R1-L1'],
  buzzer: 'w-2-BZ1',
  face: 51.5 - 200,
  panel: { x: -230, y: -226, w: 210, h: 204 },
  font: 31,
  duty: duty8,
  ongoing: true,
  right: 0,
});
