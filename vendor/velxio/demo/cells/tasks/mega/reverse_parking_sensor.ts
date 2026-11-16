import { easeInOutCubic, lerp, sinceLast } from '../../anim';
import type { Cell, Rect } from '../../cell';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';
import { ping, runPing } from '../../decor/ping';
import { setSound, sound, type SoundDir } from '../../decor/sound';

type Buzzer = HTMLElement & { hasSignal: boolean };

// A wall closes in from 90 cm to 10 cm and backs off again. Each loop the sketch
// pings, beeps 1 kHz for 50 ms, then waits map(d, 0..100, 30..500) ms, so the
// beeps come faster as the wall gets closer.
const FAR = 90;
const NEAR = 10;
const BEEP = 50;

function distance(t: number) {
  if (t < 500) return FAR;
  if (t < 2000) return lerp(FAR, NEAR, easeInOutCubic((t - 500) / 1500));
  if (t < 2800) return NEAR;
  if (t < 4300) return lerp(NEAR, FAR, easeInOutCubic((t - 2800) / 1500));
  return FAR;
}
// map() and the C ports divide in integers, so the gap truncates.
const gapAt = (t: number) => 30 + Math.trunc((470 * Math.round(distance(t))) / 100);

const BEEPS: number[] = [];
for (let b = 0; b < 4800; b += BEEP + gapAt(b)) BEEPS.push(b);
// The loop ends where the next beep would start, so it restarts on the beat.
const DURATION = BEEPS[BEEPS.length - 1] + BEEP + gapAt(BEEPS[BEEPS.length - 1]);
const ALL_BEEPS = [...BEEPS, DURATION];

const WALL = obstacleSize('wall');
const STRIP_MS = 1500;

/** What differs between boards: wire ids, where the panel and the wall go. */
export interface ReverseBoard {
  /** Class prefix, unique per board's card. */
  prefix: string;
  trig: string;
  echo: string[];
  buzzer: string;
  /** The edge the transducers face, cell coordinates: the top edge, with the wall above it, or with
   * `axis` set, the right edge of a module turned 90°, the wall standing on end to its right. */
  face: number;
  /** Facing right: the sensor's horizontal centre line, cell coordinates. */
  axis?: number;
  /** Which way the buzzer's rings travel (default right). */
  soundDir?: SoundDir;
  /** x and y of the panel and its width; its height follows the text size. */
  panel: Omit<Rect, 'h'>;
  /** Text size, px (default 24). */
  font?: number;
  /** The bounds' right and bottom edges (the circuit's own extent is added to them). */
  right: number;
  bottom: number;
}

export function reverseCell(b: ReverseBoard): Cell {
  const rp = b.prefix;
  const font = b.font ?? 24;
  const side = b.axis !== undefined;
  const gapRowTop = 8 + (font * 5) / 3;
  // A strip of the last STRIP_MS of beeps, newest at the right.
  const STRIP = { x: 16, y: gapRowTop + 2 * font, w: b.panel.w - 32, h: (font * 17) / 12 };
  const PANEL = { ...b.panel, h: STRIP.y + STRIP.h + 20 };
  // The wall's gap to the sensor's face grows with the distance.
  const wallGap = (d: number) => 12 + (40 * (d - NEAR)) / (FAR - NEAR);
  const rpTurn = `${rp}turn`;
  // Facing right, the wall stands on end: its wrapper turns a quarter, so the wall's own x runs down the card.
  const wall = side ? `<div class="${rpTurn}">${obstacle('wall', 'wall')}</div>` : obstacle('wall', 'wall');
  const bounds: [number, number, number, number] = side
    ? [PANEL.x, Math.min(PANEL.y, b.axis! - WALL.w / 2), Math.max(b.right, b.face + wallGap(FAR) + WALL.h), Math.max(b.bottom, b.axis! + WALL.w / 2)]
    : [PANEL.x, b.face - wallGap(FAR) - WALL.h, b.right, b.bottom];
  return {
    duration: DURATION,
    decor: {
      html: `
        <style>
          .${rp}panel {
            position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
            background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          }
          .${rp}row { position: absolute; left: 16px; right: 16px; font: 700 ${font}px var(--mono); color: var(--ink); white-space: nowrap; }
          .${rp}strip { fill: #f1f3f6; stroke: #e2e6ec; stroke-width: 1.5; }
          .${rp}tick { fill: #ffcc00; stroke: #c99a00; stroke-width: 1; }
          .${rpTurn} { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: rotate(90deg); }
        </style>
        ${wall}
        <div class="${rp}panel">
          <div class="${rp}row" style="top:8px;color:#0066ff" data-k="cm"></div>
          <div class="${rp}row" style="top:${gapRowTop}px" data-k="gap"></div>
          <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
            <rect class="${rp}strip" x="${STRIP.x}" y="${STRIP.y}" width="${STRIP.w}" height="${STRIP.h}" rx="6" />
            <g data-k="ticks"></g>
          </svg>
        </div>
        ${ping('p')}${sound('buzz')}`,
      bounds,
    },
    run(t, view) {
      const d = distance(t);
      const sensor = view.box('US1');
      if (side) placeObstacle(view, 'wall', b.axis! - WALL.w / 2, -(b.face + wallGap(d)) - WALL.h);
      else placeObstacle(view, 'wall', sensor.x + sensor.w / 2 - WALL.w / 2, b.face - wallGap(d) - WALL.h);

      // Each beep follows the ping that measured it.
      const beepAt = BEEPS.filter((x) => x <= t).pop() ?? 0;
      view.q<HTMLElement>('[data-k="gap"]').textContent = `gap ${gapAt(beepAt)} ms`;
      // The panel shows the reading the current gap came from.
      view.q<HTMLElement>('[data-k="cm"]').textContent = `${Math.round(distance(beepAt))} cm`;
      const sinceBeep = t - beepAt;
      const beeping = sinceBeep < BEEP;
      view.part<Buzzer>('BZ1').hasSignal = beeping;
      if (beeping) view.glowWire(b.buzzer, 1);

      const ticks = [-DURATION, 0]
        .flatMap((base) => BEEPS.map((x) => base + x))
        .filter((x) => x > t - STRIP_MS && x <= t)
        .map((x) => {
          const left = STRIP.x + STRIP.w * (1 - (t - x) / STRIP_MS);
          const w = Math.max(3, Math.min((STRIP.w * BEEP) / STRIP_MS, STRIP.x + STRIP.w - left));
          return `<rect class="${rp}tick" x="${left}" y="${STRIP.y + 5}" width="${w}" height="${STRIP.h - 10}" rx="2" />`;
        })
        .join('');
      view.q<SVGGElement>('[data-k="ticks"]').innerHTML = ticks;

      // The ping just before each beep: TRIG, a ring out of the transmit can, ECHO.
      const sincePing = sinceLast(t, ALL_BEEPS.map((x) => x - 30).filter((x) => x >= 0));
      view.glowWire(b.trig, sincePing < 20 ? 1 : 0);
      for (const w of b.echo) view.glowWire(w, sincePing > 10 && sincePing < 30 ? 1 : 0);
      // The transmit can is left as drawn; top on a module turned 90°.
      const tx = side ? { x: sensor.x + sensor.w * 0.6, y: sensor.y + sensor.h * 0.2 } : { x: sensor.x + sensor.w * 0.2, y: sensor.y + sensor.h * 0.4 };
      runPing(view, 'p', sincePing, { tx, r: Math.min(sensor.w, sensor.h) * 0.33 });

      const buzzer = view.box('BZ1');
      setSound(view, 'buzz', { x: buzzer.x + buzzer.w / 2, y: buzzer.y + buzzer.w / 2 }, sinceBeep / 45, { dir: b.soundDir ?? 'right', from: 36, to: 76, count: 2 });
    },
  };
}

export default reverseCell({
  prefix: 'c-rp-',
  trig: 'w-9-TRIG',
  echo: ['w-10-ECHO'],
  buzzer: 'w-3-BZ1',
  face: 51.5 - 200,
  panel: { x: -256, y: -216, w: 236 },
  font: 31,
  right: 0,
  bottom: 0,
});
