import { easeInOutCubic, lerp, sinceLast } from '../../anim';
import type { Cell, Rect } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';
import { ping, runPing } from '../../decor/ping';

// A box steps in from 100 cm to 55 cm and 10 cm, then steps back the same way. The sketch pings, times
// the echo, prints "Distance: N cm" and waits 200 ms (see schedule). Each step takes 300 ms and each
// stop at least 700 ms, so within one reading of a step the monitor shows where the box stands.
const DURATION = 5000;
const FAR = 100;
const NEAR = 10;
// [ms, cm] stops; the box glides between neighbours.
const KEYS: [number, number][] = [
  [0, FAR],
  [700, FAR],
  [1000, 55],
  [1700, 55],
  [2000, NEAR],
  [2900, NEAR],
  [3200, 55],
  [3900, 55],
  [4200, FAR],
];

// t may fall in the previous loop (a ping before t=0).
function distance(t: number) {
  t = ((t % DURATION) + DURATION) % DURATION;
  const i = KEYS.findIndex(([k]) => k > t);
  if (i === -1) return FAR;
  const [t0, d0] = KEYS[i - 1];
  const [t1, d1] = KEYS[i];
  return lerp(d0, d1, easeInOutCubic((t - t0) / (t1 - t0)));
}

// The real echo lasts 58 us per cm; here it is 20 ms + 0.8 ms per cm so even 10 cm shows. The echo
// starts 50 ms after the ping, once the trigger's 45 ms glow is over. On the Mega card the next ping
// waits 200 ms after the echo; a fixed `period` keeps a ported card's cadence an exact divisor of the
// loop. Each line goes out when its echo ends. Earlier loop's lines too, so the monitor never starts empty.
function schedule(period?: number) {
  const lead = 50;
  const echoMs = (d: number) => 20 + 0.8 * d;
  const pings: number[] = [];
  // Starting at 30 ms, the last line of a loop goes out before the seam.
  for (let p = 30; p < DURATION; p += period ?? lead + echoMs(distance(p)) + 200) pings.push(p);
  const prints: Print[] = [-DURATION, 0].flatMap((base) =>
    pings.map((p) => ({ t: base + p + lead + echoMs(distance(p)), text: `Distance: ${Math.round(distance(p))} cm` })),
  );
  const all = [-DURATION, 0].flatMap((base) => pings.map((p) => base + p));
  return { lead, echoMs, prints, all };
}

/** What differs between boards: names, the serial panel and where the sensor sits. */
export interface Hcsr04Board {
  /** The board element, for its TX LED; omitted where the board draws none. */
  txLed?: string;
  usb: UsbPort;
  panel: Rect;
  /** Class prefix, unique per board's card. */
  prefix: string;
  trig: string[];
  echo: string[];
  /** Which way the transducers point: up as drawn, down when the module is turned over, right when turned 90°. */
  facing: 'up' | 'down' | 'right';
  /** The edge of the sensor the transducers face (top, bottom or right), in cell coordinates. */
  face: number;
  /** Facing right: the sensor's horizontal centre line, cell coordinates. */
  axis?: number;
  /** Decor x extent, for the bounds: the panel's left edge comes from `panel`. */
  right: number;
  /** Serial text size, px (default 25); the distance label is 1 px larger. */
  font?: number;
  /** Break each line over two rows, for a narrow panel. */
  wrap?: boolean;
  /** Fixed ping cadence, ms; omitted, the Mega card's 200 ms wait after each echo. */
  period?: number;
}

const BOX = obstacleSize('box');
const GAP_NEAR = 12;
const GAP_FAR = 44;


/** The card for one board. */
export function hcsr04Cell(b: Hcsr04Board): Cell {
  const up = b.facing === 'up';
  const side = b.facing === 'right';
  const font = b.font ?? 25;
  const { lead, echoMs, prints: PRINTS, all: ALL_PINGS } = schedule(b.period);
  // The box rides in front of the transducers; its gap to the sensor shows the distance.
  const gap = (d: number) => lerp(GAP_NEAR, GAP_FAR, (d - NEAR) / (FAR - NEAR));
  const boxTop = (d: number) => (up ? b.face - gap(d) - BOX.h : b.face + gap(d));
  const dist = `${b.prefix}dist`;
  const turn = `${b.prefix}turn`;
  const labelH = font + 9;
  let bounds: [number, number, number, number];
  if (side) {
    if (b.axis === undefined) throw new Error('hcsr04Cell: facing right needs axis');
    // The label sits under the box, from its left edge, clear of the sensor.
    const labelW = 6 * 0.6 * (font + 1);
    const farX = b.face + GAP_FAR + Math.max(BOX.h, labelW);
    bounds = [
      Math.min(b.panel.x, 0),
      Math.min(b.panel.y, b.axis - BOX.w / 2),
      Math.max(b.right, farX),
      Math.max(b.panel.y + b.panel.h, b.axis + BOX.w / 2 + 4 + labelH),
    ];
  } else if (up) {
    bounds = [Math.min(b.panel.x, 0), boxTop(FAR), b.right, b.panel.y + b.panel.h];
  } else {
    const far = boxTop(FAR) + BOX.h + 4 + labelH;
    bounds = [Math.min(b.panel.x, 0), Math.min(b.panel.y, 0), b.right, Math.max(far, b.panel.y + b.panel.h)];
  }
  // Facing right, the box stands on end: its wrapper turns a quarter, so the box's own x runs down the card.
  const box = side
    ? `<div class="${turn}">${obstacle('box', 'box')}</div>`
    : obstacle('box', 'box');
  return {
    duration: DURATION,
    decor: {
      html: `
        <style>
          .${dist} {
            position: absolute; left: 0; top: 0; font: 700 ${font + 1}px var(--mono); color: #0066ff; white-space: nowrap;
          }
          .${turn} { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: rotate(90deg); }
        </style>
        ${serialPanel('out', b.panel, { note: '115200', cableTo: b.usb, fontSize: font, wrap: b.wrap })}
        ${ping('p')}${box}
        <div class="${dist}"></div>`,
      bounds,
    },
    run(t, view) {
      const sensor = view.box('US1');
      const d = distance(t);
      const label = view.q<HTMLElement>(`.${dist}`);
      label.textContent = `${Math.round(d)} cm`;
      if (side) {
        const left = b.face + gap(d);
        const top = b.axis! - BOX.w / 2;
        placeObstacle(view, 'box', top, -left - BOX.h);
        label.style.transform = `translate(${left}px, ${top + BOX.w + 4}px)`;
      } else {
        const cx = sensor.x + sensor.w / 2;
        const top = boxTop(d);
        placeObstacle(view, 'box', cx - BOX.w / 2, top);
        label.style.transform = up
          ? `translate(${cx + BOX.w / 2 + 14}px, ${top + BOX.h / 2 - labelH / 2}px)`
          : `translate(${cx - label.offsetWidth / 2}px, ${top + BOX.h + 4}px)`;
      }

      // One ring leaves the transmit can on each ping; one closes on the receive can.
      // The transmit can is left as drawn: right when the module is turned over, top when turned 90°.
      const since = sinceLast(t, ALL_PINGS);
      const echo = echoMs(distance(t - since));
      let tx, rx, r;
      if (side) {
        r = sensor.w * 0.33;
        tx = { x: sensor.x + sensor.w * 0.6, y: sensor.y + sensor.h * 0.2 };
        rx = { x: sensor.x + sensor.w * 0.6, y: sensor.y + sensor.h * 0.8 };
      } else {
        r = sensor.h * 0.33;
        const canY = sensor.y + sensor.h * (up ? 0.4 : 0.6);
        tx = { x: sensor.x + sensor.w * (up ? 0.2 : 0.8), y: canY };
        rx = { x: sensor.x + sensor.w * (up ? 0.8 : 0.2), y: canY };
      }
      runPing(view, 'p', since, { tx, rx, r, echoMs: lead - 20 + echo });

      // The 10 us trigger pulse is stretched to 45 ms so it shows.
      if (since < 45) for (const w of b.trig) view.glowWire(w, 1);
      if (since > lead && since < lead + echo) for (const w of b.echo) view.glowWire(w, 1);
      showSerial(view, 'out', t, PRINTS, { board: b.txLed });
    },
  };
}

export default hcsr04Cell({
  txLed: 'arduino-mega',
  usb: USB.mega,
  panel: { x: -366, y: -64, w: 346, h: 138 },
  font: 31,
  prefix: 'c-hc-',
  trig: ['w-9-TRIG'],
  echo: ['w-10-ECHO'],
  facing: 'up',
  face: 51.5 - 200,
  right: 260,
});
