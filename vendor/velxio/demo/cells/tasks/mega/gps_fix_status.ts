import { clamp } from '../../anim';
import type { Cell, CellView, Rect } from '../../cell';
import { glow, setGlow } from '../../decor/glow';
import { runSatellites, satellites } from '../../decor/satellites';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';

// The sky over the GPS module, shared by the GPS cells: satellites whose beams
// reach the patch antenna while the module has a fix, the module's FIX LED
// (a blink once a second while searching, as the module model drives it) and
// a status chip.

type Point = { x: number; y: number };

// The patch antenna and the FIX LED on the module artwork, relative to its box.
const ANTENNA = { dx: 46, dy: 61 };
const FIX_LED = { dx: 10.5, dy: 45.5 };
/** Satellite centres relative to the GPS box's top-left, as on the Mega card: up and to its left. */
export const SKY_LEFT: Point[] = [
  { x: -195.5, y: 86 },
  { x: -155.5, y: 46 },
  { x: -65.5, y: 18 },
];
/** SKY_LEFT with its lowest satellite moved apart from the next, for the smaller-scale ports. */
export const SKY_SPREAD: Point[] = [{ x: SKY_LEFT[0].x - 20, y: SKY_LEFT[0].y + 5 }, ...SKY_LEFT.slice(1)];
/** Top of the GPS module on the Mega card, in cell coordinates: the frame's top edge. */
export const GPS_TOP = -146;

/**
 * Decor for the FIX LED glow, the satellites unless `sats` is false, and the
 * status chip with its top-left at `chip` if given, its text `chipFont` px.
 * `prefix` names the classes.
 */
export function gpsSkyHtml(opts: { chip?: Point; chipFont?: number; sats?: boolean; prefix?: string } = {}): string {
  const { chip, chipFont = 24, sats = true, prefix = 'c-gps-' } = opts;
  return `
    <style>
      .${prefix}chip {
        position: absolute; padding: 2px 12px; border-radius: 16px;
        font: 700 24px/32px var(--sans); white-space: nowrap; border: 1.5px solid #cfd6df; background: #f8fafc; color: var(--muted);
      }
      .${prefix}chip.on { color: #00870a; border-color: #00aa00; }
      .${prefix}valid { color: #00870a; }
      .${prefix}invalid { color: var(--warn); }
    </style>
    ${sats ? satellites('gps', SKY_LEFT.length) : ''}
    ${glow('fix', { tone: 'red', scale: 0.36 })}
    ${chip ? `<div class="${prefix}chip" style="left:${chip.x}px;top:${chip.y}px;font-size:${chipFont}px;line-height:${(chipFont * 4) / 3}px"></div>` : ''}`;
}

/**
 * Sets the module's `fix` and draws the sky for time `t`: the fix holds over
 * [fixAt, lostAt) and the beams reach the antenna exactly at fixAt. `homes`
 * places the satellites relative to the GPS box; their beams stop at the box
 * side facing them.
 */
export function runGpsSky(
  view: CellView,
  t: number,
  duration: number,
  fixAt: number,
  lostAt: number,
  opts: { homes?: Point[]; prefix?: string } = {},
) {
  const { homes = SKY_LEFT, prefix = 'c-gps-' } = opts;
  const gps = view.box('GPS1');
  const antenna = { x: gps.x + ANTENNA.dx, y: gps.y + ANTENNA.dy };
  const fixed = t >= fixAt && t < lostAt;
  view.part<HTMLElement & { fix: boolean }>('GPS1').fix = fixed;

  if (view.qa('[data-satellites="gps"]').length) {
    const lock = clamp((t - fixAt + 300) / 300) * (1 - clamp((t - lostAt + 300) / 300));
    runSatellites(view, 'gps', t, {
      homes: homes.map((h) => ({ x: gps.x + h.x, y: gps.y + h.y })),
      to: antenna,
      stopX: homes[0].x < 0 ? gps.x : gps.x + gps.w,
      lock,
      duration,
    });
  }

  const blink = !fixed && t % 1000 >= 500 && t % 1000 < 700;
  setGlow(view, 'fix', { x: gps.x + FIX_LED.dx, y: gps.y + FIX_LED.dy }, blink ? 1 : 0);

  const chip = view.qa<HTMLElement>(`.${prefix}chip`)[0];
  if (chip) {
    chip.textContent = fixed ? 'GPS fix ✓' : 'searching…';
    chip.classList.toggle('on', fixed);
  }
}

/** The module's NMEA burst each second (GGA, GSA, GSV, RMC, VTG), ~150 ms after the second. */
export const NMEA_BURSTS = [0, 1000, 2000, 3000, 4000, 5000].map((t) => t + 150);

/** One NMEA byte at 9600 baud, 8N1, ms. */
export const NMEA_BYTE_MS = 10 / 9.6;

/**
 * The sentences the module model sends in the burst for `second` (its clock
 * starts at 12:00:00), without CR LF, at the test's New York position.
 */
export function nmeaBurst(second: number, fixed: boolean): string[] {
  const time = `1200${String(second).padStart(2, '0')}.000`;
  const bodies = fixed
    ? [
        `GPGGA,${time},4042.7680,N,07400.3600,W,1,08,1.2,12.5,M,0.0,M,,`,
        'GPGSA,A,3,01,02,03,04,,,,,,,,,2.4,1.2,1.9',
        'GPGSV,1,1,04,01,40,083,41,02,17,308,43,03,07,344,39,04,22,228,45',
        `GPRMC,${time},A,4042.7680,N,07400.3600,W,0.00,0.00,010126,,,A`,
        'GPVTG,0.00,T,,M,0.00,N,0.00,K,A',
      ]
    : [
        `GPGGA,${time},,,,,0,00,,,M,,M,,`,
        'GPGSA,A,1,,,,,,,,,,,,,,,',
        'GPGSV,1,1,04,01,40,083,41,02,17,308,43,03,07,344,39,04,22,228,45',
        `GPRMC,${time},V,,,,,0.00,0.00,010126,,,N`,
        'GPVTG,0.00,T,,M,0.00,N,0.00,K,N',
      ];
  return bodies.map((body) => {
    let sum = 0;
    for (const ch of body) sum ^= ch.charCodeAt(0);
    return `$${body}*${sum.toString(16).toUpperCase().padStart(2, '0')}`;
  });
}

/** One board's GPS card: its names, and where its panels and satellites go in cell coordinates. */
export interface GpsBoard {
  /** The board's circuit.ts id, whose TX LED blinks as a line goes out. */
  board: string;
  usb: UsbPort;
  /** The wire from the module's TX to the board. */
  txWire: string;
  /** Class prefix, unique per board and task: /tasks puts every card in one document. */
  prefix: string;
  /** Satellite centres relative to the GPS box. */
  homes: Point[];
  panel: Rect;
  /** Serial and chip text sizes; the defaults when left out. */
  fontSize?: number;
  chipFont?: number;
  bounds: [number, number, number, number];
}

// The module gains a fix, holds it, then loses it again; the sketch prints the
// fix status once a second, two lines of each state per loop.
const DURATION = 6000;
const FIX_AT = 1500;
const LOST_AT = 3500;

/**
 * Whether the board knows of a fix at `t`: the module's state at its latest
 * burst before `t`, since the firmware learns it only from a received sentence.
 */
export function heardFix(t: number, fixAt: number, lostAt: number): boolean {
  const burst = Math.floor((t - 150) / 1000) * 1000 + 150;
  return burst >= fixAt && burst < lostAt;
}

/**
 * `lagged` prints the status the board last heard in a burst (see heardFix);
 * without it the print follows the module's state at once.
 */
export function gpsFixStatusCell(b: GpsBoard & { chip: Point; lagged?: boolean }): Cell {
  const statusAt = (t: number) =>
    (b.lagged ? heardFix(t, FIX_AT, LOST_AT) : t >= FIX_AT && t < LOST_AT) ? 'valid' : 'invalid';
  const loopPrints: Print[] = [0, 1000, 2000, 3000, 4000, 5000].map((t) => ({
    t: t + 2,
    text: `<span class="${b.prefix}${statusAt(t + 2)}">fix ${statusAt(t + 2)}</span>`,
  }));
  // The previous loop's lines are already on screen at t=0, matching the end state.
  const prints: Print[] = [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
  return {
    duration: DURATION,
    activity: [{ wires: [b.txWire], at: NMEA_BURSTS }],
    decor: {
      html: `${serialPanel('out', b.panel, { note: '115200', cableTo: b.usb, fontSize: b.fontSize })}${gpsSkyHtml({ chip: b.chip, chipFont: b.chipFont, prefix: b.prefix })}`,
      bounds: b.bounds,
    },
    run(t, view) {
      runGpsSky(view, t, DURATION, FIX_AT, LOST_AT, { homes: b.homes, prefix: b.prefix });
      showSerial(view, 'out', t, prints, { board: b.board });
    },
  };
}

const PANEL = { x: -260, y: USB.mega.y - 56, w: 230, h: 112 };

export default gpsFixStatusCell({
  board: 'arduino-mega',
  usb: USB.mega,
  txWire: 'w-19-TX',
  prefix: 'c-gps-',
  homes: SKY_LEFT,
  panel: PANEL,
  chip: { x: PANEL.x, y: -44 },
  lagged: true,
  bounds: [PANEL.x, GPS_TOP, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});
