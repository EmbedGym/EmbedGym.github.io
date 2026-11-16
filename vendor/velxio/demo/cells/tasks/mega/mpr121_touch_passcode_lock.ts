import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { batteryPart, type BatteryOptions } from '../../decor/battery';
import { finger, tapFinger, type Tap } from '../../decor/finger';
import { lockPart, setLock } from '../../decor/lock';
import { padPart, setPad } from '../../decor/pad';

type Mpr121 = HTMLElement & { down(key: string): void; up(key: string): void };
type Relay = HTMLElement & { energized: boolean };

// A slip (0 then 2) makes the sketch print RESET and start over; then the
// code 0-1-2-3 is touched in order. On the last digit it drives pin 13 HIGH,
// so the relay powers the door lock open, and prints UNLOCKED; 3 s later it
// drops the relay and prints LOCKED. It polls about every 10 ms.
const DURATION = 5800;
const DIGITS = [0, 2, 0, 1, 2, 3];
const WRONG = 1;
const PRESSES: [number, number][] = DIGITS.map((_, i) => [200 + 400 * i, 400 + 400 * i]);
type Point = { x: number; y: number };

export interface PasscodeLockLayout {
  /** The board's own class prefix, board id, console socket and baud note. */
  prefix: string;
  board: string;
  usb: UsbPort;
  baud: string;
  /** Last touch to relay on, ms (up to one poll), and how long a line takes to send. */
  lag: number;
  printMs: number;
  serial: { x: number; y: number; w: number; h: number };
  font: number;
  /** The relay's load: the lock (top-left, scale), its 12 V pack and the corners of the three load wires. */
  lock: { x: number; y: number; scale: number };
  battery: Point & BatteryOptions;
  loadVia?: { com?: Point[]; ret?: Point[]; no?: Point[] };
  /** Each pad's top-left for electrodes 0 to 3, its diameter, the side its wire enters and that wire's corners. */
  pads: Point[];
  padD: number;
  padPin: 'right' | 'bottom' | 'left' | 'top';
  padVias: Point[][];
  /** The digit badge's top-left. */
  badge: Point;
  /** The I2C wires that flicker when the sketch reads the touch status, and the relay's signal wire. */
  i2c: string[];
  relayWire: string;
  /** `rotate: 180` reaches up from below the pads; `length` and `lift` shorten it to clear wires above them. */
  finger?: { rotate?: 0 | 180; length?: number; lift?: number };
  /** The firmware sleeps through the unlock instead of polling (the ESP-IDF and Zephyr sketches). */
  sleepsWhileOpen?: boolean;
  /** The digit badge's text size; the box grows with it. */
  badgeFont?: number;
}

const BADGE = { w: 52, h: 56 };
const PAD_COLORS = ['#00aaaa', '#ff66cc', '#0066ff', '#aa00ff'];

export function passcodeLockCell(o: PasscodeLockLayout): Cell {
  const p = o.prefix;
  const relayOn = PRESSES[PRESSES.length - 1][0] + o.lag;
  const relayOff = relayOn + 3000;
  const loopPrints: Print[] = [
    { t: PRESSES[WRONG][0] + o.lag + o.printMs, text: 'RESET' },
    { t: relayOn + o.printMs, text: 'UNLOCKED' },
    { t: relayOff + o.printMs, text: 'LOCKED' },
  ];
  // The previous loop's lines are on screen at t=0, matching the end state.
  const prints: Print[] = [...loopPrints.map((q) => ({ ...q, t: q.t - DURATION })), ...loopPrints];
  const up = o.finger?.rotate === 180;
  const length = o.finger?.length ?? 96;
  const lift = o.finger?.lift ?? 26;
  const k = (o.badgeFont ?? 36) / 36;
  const badgeBox = { w: BADGE.w * k, h: BADGE.h * k };
  // The fingertip lands just past the pad's centre, on the side it comes from.
  const pressAt = o.pads.map((q) => ({ x: q.x + o.padD / 2, y: q.y + o.padD / 2 + (up ? -8 : 8) }));
  const taps: Tap[] = PRESSES.map(([down, up], i) => ({ at: pressAt[DIGITS[i]], down, up }));
  const { x: bx, y: by, ...batteryOpts } = o.battery;
  return {
    duration: DURATION,
    extras: {
      parts: [
        lockPart('LOCK', o.lock.x, o.lock.y, o.lock.scale),
        batteryPart('BAT', bx, by, batteryOpts),
        ...o.pads.map((at, digit) => padPart(`PAD${digit}`, at.x, at.y, { scale: o.padD / 48, pin: o.padPin })),
      ],
      wires: [
        { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff8800', via: o.loadVia?.com },
        { id: 'load-ret', from: ['BAT', 'neg'], to: ['LOCK', 'A'], color: '#8b4513', via: o.loadVia?.ret },
        { id: 'load-no', from: ['RLY1', 'NO'], to: ['LOCK', 'B'], color: '#aa00ff', via: o.loadVia?.no },
        ...o.pads.map((_, digit) => ({
          id: `pad-${digit}`,
          from: ['TOUCH1', String(digit)] as [string, string],
          to: [`PAD${digit}`, 'e'] as [string, string],
          color: PAD_COLORS[digit],
          via: o.padVias[digit],
        })),
      ],
    },
    decor: {
      html: `
      <style>
        .${p}-badge {
          position: absolute; left: ${o.badge.x}px; top: ${o.badge.y}px; width: ${badgeBox.w}px; height: ${badgeBox.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 700 ${36 * k}px var(--mono); color: var(--accent);
        }
        .${p}-badge.${p}-wrong { color: var(--warn); }
      </style>
      <div class="${p}-badge"></div>
      ${serialPanel('out', o.serial, { note: o.baud, cableTo: o.usb, fontSize: o.font })}
      ${finger('f', { rotate: up ? 180 : 0, length })}`,
      // The hovering finger reaches its length plus its lift past the press point.
      bounds: [
        Math.min(o.serial.x, o.badge.x),
        Math.min(o.serial.y, o.badge.y, ...pressAt.map((q) => (up ? Infinity : q.y - length - lift))),
        Math.max(o.serial.x + o.serial.w, o.badge.x + badgeBox.w),
        Math.max(o.serial.y + o.serial.h, o.badge.y + badgeBox.h, ...pressAt.map((q) => (up ? q.y + length + lift : -Infinity))),
      ],
    },
    // A sketch that sleeps through the 3 s unlock reads the last release only once the relay drops.
    activity: [
      {
        wires: o.i2c,
        at: o.sleepsWhileOpen
          ? [...PRESSES.flatMap(([down, up]) => [down + 8, up + 8]).slice(0, -1), relayOff + 8]
          : PRESSES.flatMap(([down, up]) => [down + 8, up + 8]),
      },
    ],
    run(t, view) {
      const active = tapFinger(view, 'f', t, taps, DURATION, { lift });
      const pad = view.part<Mpr121>('TOUCH1');
      [0, 1, 2, 3].forEach((digit) => {
        const key = String(digit);
        const isDown = pad.shadowRoot!.querySelector(`[data-key="${key}"]`)!.getAttribute('aria-pressed') === 'true';
        const want = active !== -1 && DIGITS[active] === digit;
        setPad(view, `PAD${digit}`, want);
        view.glowWire(`pad-${digit}`, want ? 0.8 : 0);
        if (want && !isDown) pad.down(key);
        if (!want && isDown) pad.up(key);
      });
      // The badge shows each digit from its touch until the finger has lifted.
      const shown = PRESSES.findIndex(([down, up]) => t >= down && t < up + 150);
      const badge = view.q<HTMLElement>(`.${p}-badge`);
      badge.style.opacity = shown === -1 ? '0' : '1';
      badge.textContent = shown === -1 ? '' : String(DIGITS[shown]);
      badge.classList.toggle(`${p}-wrong`, shown === WRONG);

      const on = t >= relayOn && t < relayOff;
      view.part<Relay>('RLY1').energized = on;
      if (on) {
        view.glowWire(o.relayWire, 1);
        for (const id of ['load-com', 'load-ret', 'load-no']) view.glowWire(id, 0.6);
      }
      // The bolt slides in over 120 ms after the relay closes and back out after it opens.
      setLock(view, 'LOCK', t < relayOff ? clamp((t - relayOn) / 120) : 1 - clamp((t - relayOff) / 120));
      showSerial(view, 'out', t, prints, { board: o.board });
    },
  };
}

// On the Mega the four pads sit in a row above the module, electrode 0's pad
// on the right. Each wire comes up into its pad's centre from below, clear of
// the pressing finger, and no two cross. The relay's load, a solenoid door lock
// on a 12 V pack, is stacked over the relay so each load wire runs straight:
// COM up to the pack's + below it, the pack's − on top up to the lock, the lock
// back down to NO. The lock is scaled so its pins sit over the pack's − and the
// relay's NO. The pads carry no numbers, so a badge left of the lock names the
// digit being touched.
export default passcodeLockCell({
  prefix: 'c-mprl',
  board: 'arduino-mega',
  usb: USB.mega,
  baud: '9600',
  // The relay follows the touch within the 10 ms poll; "UNLOCKED\r\n" takes about 10 ms at 9600 baud.
  lag: 10,
  printMs: 10,
  serial: { x: -222, y: USB.mega.y - 100, w: 200, h: 121 },
  font: 28,
  lock: { x: 2.5, y: -309, scale: 1.375 },
  battery: { x: 49, y: -183, leads: 'across' },
  pads: [358, 304.8, 230, 174].map((x) => ({ x, y: -201 })),
  padD: 44,
  padPin: 'bottom',
  padVias: [
    [{ x: 336.4, y: -141 }, { x: 380, y: -141 }],
    [],
    [{ x: 317.2, y: -149 }, { x: 252, y: -149 }],
    [{ x: 307.6, y: -141 }, { x: 196, y: -141 }],
  ],
  badge: { x: -70, y: -240 },
  i2c: ['w-SDA', 'w-SCL'],
  relayWire: 'w-13',
});
