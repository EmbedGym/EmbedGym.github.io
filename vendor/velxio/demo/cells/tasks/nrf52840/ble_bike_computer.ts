import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { GREEN, METAL, METAL_EDGE, MUTED, PHONE_RULE, PLASTIC_DARK, PLASTIC_DARK_EDGE, RED, RED_EDGE, SCANNING, TEXT, TREAD, TYRE } from '../../decor/common';
import { FLIGHT, airLane, runAir, type Packet } from './ble_uart_console';

// | board  | nrf52840-dk                                             |
// | LCD    | LCD1 (turned 90°): w-P0.04-RS, w-P0.05-E, w-P0.02-D4 …  |
// | radio  | B1                                                      |
const LCD_BUS = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];

type Lcd = HTMLElement & { text: string };

// The board is the central; BLE-Wheel is a Cycling Speed and Cadence sensor
// that notifies its cumulative wheel revolutions and last wheel event time
// (1/1024 s) once a second, at board time k + 0.25 s. The loop plays the
// test's whole 50 s run, time compressed unevenly (a clock shows board time):
// power-on, connect, the first notification sets the baseline; at 10 s the
// rider sets off at 15.1 km/h, then 30.2, and stops at 0.09 km; 3 s without a
// turn reads 0.0. At 30 s the sensor reboots (the test's drop): it hangs up,
// is silent 1 s, advertises, the board reconnects, and its restarted counter
// only rebaselines. At 36 s the rider sets off at 20.2 km/h and stops at
// 0.14 km. Then the DK's reset button brings the loop back to power-on.
const DURATION = 6000;
// Board seconds against loop ms; time runs fastest while nothing changes.
const KNOTS: [number, number][] = [
  [0, 0],
  [1.6, 700],
  [10.4, 850],
  [24.6, 2250],
  [27.6, 2750],
  [30, 3050],
  [31, 3250],
  [32.6, 3950],
  [36.6, 4200],
  [45.4, 5050],
  [48.6, 5420],
  [50, 5570],
];
const RESET_MS = 5600;
/** Board seconds at loop time t; held while the board is in reset. */
function board(t: number): number {
  const i = KNOTS.findIndex(([, ms]) => ms > t);
  if (i < 0) return KNOTS[KNOTS.length - 1][0];
  const [b0, m0] = KNOTS[i - 1];
  const [b1, m1] = KNOTS[i];
  return b0 + ((t - m0) / (m1 - m0)) * (b1 - b0);
}
/** Loop ms at board second b. */
function loop(b: number): number {
  const i = KNOTS.findIndex(([kb]) => kb > b);
  if (i < 0) return KNOTS[KNOTS.length - 1][1];
  const [b0, m0] = KNOTS[i - 1];
  const [b1, m1] = KNOTS[i];
  return m0 + ((b - b0) / (b1 - b0)) * (m1 - m0);
}
/** Board seconds per loop second at t. */
function pace(t: number): number {
  const i = KNOTS.findIndex(([, ms]) => ms > t);
  if (i < 0) return 0;
  return ((KNOTS[i][0] - KNOTS[i - 1][0]) * 1000) / (KNOTS[i][1] - KNOTS[i - 1][1]);
}

// peer.py's script, in u = 1/1024 s of board time: wheel rides (start,
// period, count) with events at start + period * i; before its reboot the
// sensor counts on from a lifetime total on a clock offset from the board's.
const RIDES: [number, number, number][] = [
  [10240, 512, 12],
  [16512, 256, 32],
  [36928, 383, 23],
];
const FIRST_REVS = 123456;
const FIRST_EVENT = -5120;
const CLOCK_OFFSET = 45312;
const DROP = 30;
const REBOOT_U = 31744;
const ADVERTISE = REBOOT_U / 1024;
// Each connection is made after the advert that the board saw has landed.
const CONNECT1 = 0.6;
const CONNECT2 = ADVERTISE + 0.6;
const WHEEL_M = 2.1;
const STOPPED_AFTER_S = 3;

function eventsUntil(after: number, until: number): { count: number; last: number | null } {
  let count = 0;
  let last: number | null = null;
  for (const [start, period, n] of RIDES)
    for (let i = 1; i <= n; i++) {
      const e = start + period * i;
      if (e > after && e <= until) {
        count++;
        last = last === null ? e : Math.max(last, e);
      }
    }
  return { count, last };
}
/** The sensor's measurement at u: cumulative revolutions and last event time (uint16). */
function measurement(u: number): { revs: number; time: number } {
  if (u < REBOOT_U) {
    const { count, last } = eventsUntil(-Infinity, u);
    return { revs: FIRST_REVS + count, time: ((last ?? FIRST_EVENT) + CLOCK_OFFSET) & 0xffff };
  }
  const { count, last } = eventsUntil(REBOOT_U, u);
  return { revs: count, time: last === null ? 0 : (last - REBOOT_U) & 0xffff };
}

const linked = (b: number) => (b > CONNECT1 && b < DROP) || (b > CONNECT2 && b < 50.5);
const NOTIFIES = Array.from({ length: 50 }, (_, k) => k + 0.25).filter(linked);

type Ride = { at: number; total: number; speed: number; lastTurn: number; rebaseline: boolean };
// The firmware's handle_wheel_data after each notification.
const RIDE: Ride[] = (() => {
  const out: Ride[] = [];
  let have = false;
  let lastRevs = 0;
  let valid = false;
  let lastEvent = 0;
  let total = 0;
  let speed = 0;
  let lastTurn = -Infinity;
  for (const at of NOTIFIES) {
    // The link dropped: the speed reference is invalid until a new baseline.
    if (at > CONNECT2 && out[out.length - 1].at < DROP) valid = false;
    const m = measurement(Math.floor(at * 1024));
    let d = have ? m.revs - lastRevs : 0;
    const rebaseline = !valid || d < 0;
    if (d < 0) d = 0;
    total += d;
    lastRevs = m.revs;
    have = true;
    if (valid && d > 0) {
      speed = (d * WHEEL_M * 1024 * 3.6) / ((m.time - lastEvent) & 0xffff);
      lastTurn = at;
    }
    if (!valid || d > 0) {
      lastEvent = m.time;
      valid = true;
    }
    out.push({ at, total, speed, lastTurn, rebaseline });
  }
  return out;
})();

const row = (s: string) => s.padEnd(16, ' ');
const BOOT_RIDE: Ride = { at: 0, total: 0, speed: 0, lastTurn: -Infinity, rebaseline: false };
/** The LCD rows at board second b; the firmware redraws every 100 ms. */
function display(b: number): { row0: string; row1: string } {
  const now = Math.floor(b * 10) / 10;
  const r = RIDE.findLast((x) => x.at <= now) ?? BOOT_RIDE;
  const kmh = now - r.lastTurn < STOPPED_AFTER_S ? r.speed : 0;
  return { row0: `Speed ${kmh.toFixed(1)} km/h`, row1: `Dist ${((r.total * WHEEL_M) / 1000).toFixed(2)} km` };
}
// The firmware rewrites a row only when its text changes; at boot it writes both.
const WRITES = (() => {
  const out = [20];
  for (let k = 1; k <= 500; k++) {
    const a = display((k - 1) / 10);
    const b = display(k / 10);
    if (a.row0 + a.row1 !== b.row0 + b.row1) out.push(loop(k / 10));
  }
  return out;
})();

/** Wheel revolutions by board second b, gliding between events. */
function revolutions(b: number): number {
  const u = b * 1024;
  return RIDES.reduce((sum, [start, period, n]) => sum + clamp((u - start) / period, 0, n), 0);
}
const ALL_REVS = RIDES.reduce((sum, [, , n]) => sum + n, 0);
// Drawn as a whole number of turns a loop, far fewer than the real ones, which would strobe.
const DRAWN_TURNS = 4;

// The sensor advertises after power-on and after its reboot; notifications
// land on the board at their tick. While time races, only one dot in 90 ms is drawn.
const PACKETS: Packet[] = [
  ...[0, loop(ADVERTISE)].map((t): Packet => ({ t, dir: 'up', adv: true })),
  ...NOTIFIES.map((b) => loop(b) - FLIGHT)
    .filter((t, i, all) => i === 0 || t - all[i - 1] >= 90)
    .map((t): Packet => ({ t, dir: 'up' })),
];
// The DK's IF BOOT/RESET button, which resets the nRF52840, relative to the board.
const RESET_BUTTON = { x: 298, y: 234 };
const PRESS: [number, number][] = [
  [RESET_MS, DURATION + 1],
  [-1, 0],
];

// Each tag shows from its board second for 450 ms of the loop, or until the next.
const TAGS = [
  { b: RIDE[0].at, text: 'baseline' },
  { b: RIDE.find((r) => r.at > 20 && r.lastTurn < r.at)!.lastTurn + STOPPED_AFTER_S + 0.05, text: 'no turn 3 s → 0.0' },
  { b: DROP, text: 'sensor reboots' },
  { b: RIDE.find((r) => r.at > DROP)!.at, text: 'count reset' },
  { b: RIDE[RIDE.length - 1].lastTurn + STOPPED_AFTER_S + 0.05, text: 'no turn 3 s → 0.0' },
].map((g) => ({ ...g, from: loop(g.b) }));

const FONT = 34;
// Cell coordinates. B1's box is (300, 296) 88 x 70, under the LCD wires; the wheel left of it.
const B1 = { x: 300, y: 296, w: 88, h: 70 };
const WHEEL = { cx: -4, cy: 315, r: 56 };
const LANE = { x0: WHEEL.cx + WHEEL.r + 8, x1: B1.x, y: B1.y + B1.h / 2 };
const READ = { x: 560, y: -54, w: 350, h: 100 };
// The clock sits above the board's left end, clear of the LCD wires.
const CLOCK = { x: -110, y: READ.y };
const TAG = { x: 560, y: 58 };
const LABEL_Y = WHEEL.cy + WHEEL.r + 12;

const wheelHtml = (() => {
  const { cx, cy, r } = WHEEL;
  const spokes = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8;
    return `<line x1="${(8 * Math.cos(a)).toFixed(1)}" y1="${(8 * Math.sin(a)).toFixed(1)}" x2="${((r - 9) * Math.cos(a)).toFixed(1)}" y2="${((r - 9) * Math.sin(a)).toFixed(1)}" />`;
  }).join('');
  // The chainstay runs from the hub to the right; the sensor pod is clamped on it, by the magnet's path.
  const pod = { x: 0.55 * r - 12, y: -0.18 * r - 18, w: 24, h: 36 };
  return `
    <svg style="position:absolute;left:${cx - r - 6}px;top:${cy - r - 6}px;overflow:visible" width="${2 * r + 12}" height="${2 * r + 12}" viewBox="${-r - 6} ${-r - 6} ${2 * r + 12} ${2 * r + 12}">
      <circle r="${r}" fill="none" stroke="${TYRE}" stroke-width="9" />
      <circle r="${r - 4}" fill="none" stroke="${TREAD}" stroke-width="1.4" />
      <g data-c-bbcn-spin>
        <circle r="${r - 8}" fill="none" stroke="${METAL_EDGE}" stroke-width="3" />
        <g stroke="${METAL_EDGE}" stroke-width="1.3">${spokes}</g>
        <rect x="-5" y="${-0.72 * r - 6}" width="10" height="12" rx="2" fill="${RED}" stroke="${RED_EDGE}" stroke-width="1.4" />
      </g>
      <line x1="0" y1="0" x2="${r + 4}" y2="${-0.33 * r}" stroke="${METAL_EDGE}" stroke-width="7" stroke-linecap="round" />
      <line x1="0" y1="0" x2="${r + 4}" y2="${-0.33 * r}" stroke="${METAL}" stroke-width="4" stroke-linecap="round" />
      <circle r="8" fill="${METAL}" stroke="${METAL_EDGE}" stroke-width="1.6" />
      <rect x="${pod.x}" y="${pod.y}" width="${pod.w}" height="${pod.h}" rx="6" fill="${PLASTIC_DARK}" stroke="${PLASTIC_DARK_EDGE}" stroke-width="1.6" />
      <circle data-c-bbcn-led cx="${pod.x + pod.w / 2}" cy="${pod.y + 10}" r="4.5" fill="${MUTED}" />
    </svg>
    <div style="position:absolute;left:${cx - 110}px;width:220px;top:${LABEL_Y}px;text-align:center;white-space:nowrap;font:700 ${FONT}px/1 var(--sans);color:${TEXT}">BLE-Wheel</div>`;
})();

function link(t: number, b: number): [string, string] {
  if (t >= RESET_MS) return ['board reset', MUTED];
  if (b < CONNECT1) return ['scanning…', SCANNING];
  if (b < DROP || b >= CONNECT2) return ['connected', GREEN];
  if (b < ADVERTISE) return ['rebooting', MUTED];
  return ['scanning…', SCANNING];
}

const pill = `padding:2px 8px;border-radius:8px;background:${PHONE_RULE};white-space:nowrap;font:600 ${FONT}px/1.2 var(--sans);color:${TEXT}`;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${airLane('air', LANE)}
      <div data-c-bbcn-link style="position:absolute;left:${B1.x + B1.w / 2 - 130}px;width:260px;top:${B1.y + B1.h + 8}px;text-align:center;white-space:nowrap;font:600 ${FONT}px/1 var(--sans)"></div>
      ${wheelHtml}
      <div data-c-bbcn-read style="position:absolute;left:${READ.x}px;top:${READ.y}px;width:${READ.w}px;height:${READ.h}px;box-sizing:border-box;padding:6px 9px;border-radius:4px;background:#6cb201;border:3px solid #1f2937;font:600 ${FONT}px/41px ui-monospace, Menlo, monospace;white-space:pre;overflow:hidden"></div>
      ${finger('f')}
      <div data-c-bbcn-clock style="position:absolute;left:${CLOCK.x}px;top:${CLOCK.y}px;white-space:nowrap;font:600 ${FONT}px/1.2 var(--sans);color:${MUTED};font-variant-numeric:tabular-nums"></div>
      <div data-c-bbcn-tag style="position:absolute;left:${TAG.x}px;top:${TAG.y}px;${pill}"></div>`,
    bounds: [WHEEL.cx - 110, READ.y, READ.x + READ.w, LABEL_Y + FONT + 2],
  },
  activity: [{ wires: LCD_BUS, at: WRITES.map((ms) => ms - 5) }],
  run(t, view) {
    const b = board(t);
    const angle = (360 * DRAWN_TURNS * revolutions(b)) / ALL_REVS;
    view.q<SVGGElement>('[data-c-bbcn-spin]').setAttribute('transform', `rotate(${angle.toFixed(2)})`);

    const [linkText, linkColor] = link(t, b);
    view.q<SVGCircleElement>('[data-c-bbcn-led]').setAttribute('fill', linkColor);
    const linkEl = view.q<HTMLElement>('[data-c-bbcn-link]');
    linkEl.textContent = linkText;
    linkEl.style.color = linkColor;
    runAir(view, 'air', t, PACKETS);

    // Held in reset, the board stops; on release it boots and writes both rows afresh.
    pressFinger(view, 'f', t, RESET_BUTTON, PRESS);
    // Shown from 300 ms before it presses until 300 ms after it lifts.
    view.q<HTMLElement>('[data-finger="f"]').style.opacity = String(Math.max(clamp((300 - t) / 150), clamp((t - RESET_MS + 300) / 150)));
    const d = display(b);
    view.part<Lcd>('LCD1').text = row(d.row0) + row(d.row1);
    view.q<HTMLElement>('[data-c-bbcn-read]').textContent = `${d.row0}\n${d.row1}`;

    // Board time since power-on; ▶▶ while it races through a stretch where nothing changes.
    const clock = view.q<HTMLElement>('[data-c-bbcn-clock]');
    clock.textContent = `t ${Math.floor(b)} s${pace(t) > 15 ? ' ▶▶' : ''}`;
    clock.style.opacity = String(Math.min(clamp(t / 150), clamp((DURATION - 50 - t) / 300)));

    const tagEl = view.q<HTMLElement>('[data-c-bbcn-tag]');
    const i = TAGS.findLastIndex((g) => g.from <= t);
    const tag = TAGS[i];
    const until = Math.min(tag ? tag.from + 450 : 0, TAGS[i + 1]?.from ?? RESET_MS, RESET_MS);
    tagEl.textContent = tag?.text ?? '';
    tagEl.style.opacity = String(tag ? Math.min(clamp((t - tag.from) / 150), clamp((until - t) / 150)) : 0);
  },
};

export default cell;
