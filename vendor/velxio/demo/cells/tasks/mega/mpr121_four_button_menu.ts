import type { Cell, ExtraPart, ExtraWire } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { finger, tapFinger, type Tap } from '../../decor/finger';
import { padPart, setPad } from '../../decor/pad';

type Mpr121 = HTMLElement & { down(key: string): void; up(key: string): void };

// Electrodes 0 to 3 are touched in turn. The sketch polls the touch status
// every ~10 ms and prints one line per electrode that changed.
const DURATION = 6000;
const KEYS = ['0', '1', '2', '3'];
const PRESSES: [number, number][] = [
  [400, 1000],
  [1800, 2400],
  [3200, 3800],
  [4600, 5200],
];
type Point = { x: number; y: number };

export interface FourButtonLayout {
  /** The board id, its console socket and the baud note. */
  board: string;
  usb: UsbPort;
  baud: string;
  /** Press to line sent, ms: up to one 10 ms poll, the I2C read and the line's send time. */
  seen: number;
  serial: { x: number; y: number; w: number; h: number };
  font: number;
  /** Each pad's top-left, for electrodes 0 to 3, the side its wire enters, and that wire's corners. */
  pads: Point[];
  padPin?: 'right' | 'bottom' | 'left' | 'top';
  vias: Point[][];
  /** The I2C wires that flicker when the sketch reads the touch status. */
  i2c: string[];
  /** `rotate: 180` reaches up from below the pads; `length` and `lift` shorten the finger to clear wires above them. */
  finger?: { rotate?: 0 | 180; length?: number; lift?: number };
}

// The four round copper touch pads, which circuit.ts leaves out, one per electrode 0 to 3.
const PAD_D = 56;
const COLORS = ['#00aaaa', '#aa00ff', '#ff66cc', '#0066ff'];

export function fourButtonCell(o: FourButtonLayout): Cell {
  const loopPrints: Print[] = PRESSES.flatMap(([down, up], i) => [
    { t: down + o.seen, text: `Button: ${i} State: touched` },
    { t: up + o.seen, text: `Button: ${i} State: released` },
  ]);
  // The previous loop's lines are on screen at t=0, matching the end state.
  const prints: Print[] = [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
  const pads: ExtraPart[] = KEYS.map((key, i) => padPart(`PAD${key}`, o.pads[i].x, o.pads[i].y, { scale: PAD_D / 48, pin: o.padPin }));
  const padWires: ExtraWire[] = KEYS.map((key, i) => ({
    id: `pad-${key}`,
    from: ['TOUCH1', key],
    to: [`PAD${key}`, 'e'],
    color: COLORS[i],
    via: o.vias[i],
  }));
  const up = o.finger?.rotate === 180;
  const length = o.finger?.length ?? 96;
  const lift = o.finger?.lift ?? 26;
  // The fingertip lands 10 px past the pad's centre, on the side it comes from.
  const taps: Tap[] = PRESSES.map(([down, release], i) => ({
    at: { x: o.pads[i].x + PAD_D / 2, y: o.pads[i].y + PAD_D / 2 + (up ? -10 : 10) },
    down,
    up: release,
  }));
  const pressYs = taps.map((tap) => tap.at.y);
  const reach = length + lift;
  return {
    duration: DURATION,
    extras: { parts: pads, wires: padWires },
    decor: {
      html: `
      ${serialPanel('out', o.serial, { note: o.baud, cableTo: o.usb, wrap: true, fontSize: o.font })}
      ${finger('f', { rotate: up ? 180 : 0, length })}`,
      // The hovering finger reaches its length plus its lift past the press point.
      bounds: [
        o.serial.x,
        Math.min(o.serial.y, up ? Infinity : Math.min(...pressYs) - reach),
        o.serial.x + o.serial.w,
        Math.max(o.serial.y + o.serial.h, up ? Math.max(...pressYs) + reach : -Infinity),
      ],
    },
    activity: [{ wires: o.i2c, at: PRESSES.flatMap(([down, up]) => [down + 8, up + 8]) }],
    run(t, view) {
      const active = tapFinger(view, 'f', t, taps, DURATION, { lift });
      const pad = view.part<Mpr121>('TOUCH1');
      KEYS.forEach((key, i) => {
        const want = active === i;
        setPad(view, `PAD${key}`, want);
        view.glowWire(`pad-${key}`, want ? 0.8 : 0);
        const isDown = pad.shadowRoot!.querySelector(`[data-key="${key}"]`)!.getAttribute('aria-pressed') === 'true';
        if (want && !isDown) pad.down(key);
        if (!want && isDown) pad.up(key);
      });
      showSerial(view, 'out', t, prints, { board: o.board });
    },
  };
}

// On the Mega the pads sit in a row left of the module, electrode 0's pad
// farthest out. Each wire runs over the electrode row and drops into its pad's
// right side through the gap after it.
const PAD_Y = -124;
const PAD_XS = [-98, -18, 62, 142];
const ELECTRODE_XS = [344.4, 334.8, 325.2, 315.6];
const LEVELS = [-165, -157, -149, -141];
export default fourButtonCell({
  board: 'arduino-mega',
  usb: USB.mega,
  baud: '9600',
  // Up to one 10 ms poll, the I2C read, then "Button: 0 State: touched" at 9600 baud.
  seen: 35,
  serial: { x: -312, y: -52, w: 290, h: 186 },
  font: 26,
  pads: PAD_XS.map((x) => ({ x, y: PAD_Y })),
  vias: KEYS.map((_, i) => [
    { x: ELECTRODE_XS[i], y: LEVELS[i] },
    { x: PAD_XS[i] + PAD_D + 12, y: LEVELS[i] },
    { x: PAD_XS[i] + PAD_D + 12, y: PAD_Y + PAD_D / 2 },
  ]),
  i2c: ['w-SDA', 'w-SCL'],
});
