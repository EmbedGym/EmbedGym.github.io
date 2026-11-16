import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { padPart, setPad } from '../../decor/pad';

type Mpr121 = HTMLElement & { down(key: string): void; up(key: string): void };

// Electrode 0 is touched twice. The sketch polls the touch status every ~10 ms
// and prints once per change, so each touch gives "Touched!" then "Released!".
const DURATION = 4000;
const TOUCHES: [number, number][] = [
  [500, 1300],
  [2300, 3100],
];
type Point = { x: number; y: number };

export interface SingleTouchLayout {
  /** The board's own class prefix, board id, console socket and baud note. */
  prefix: string;
  board: string;
  usb: UsbPort;
  baud: string;
  /** Press to line sent, ms: up to one 10 ms poll, the I2C read and the line's send time. */
  seen: number;
  serial: { x: number; y: number; w: number; h: number };
  font: number;
  /** The pad's top-left and diameter, the side its wire leaves, and that wire's corners. */
  pad: { x: number; y: number; d: number };
  padPin?: 'right' | 'bottom' | 'left' | 'top';
  padVia: Point[];
  /** The I2C wires that flicker when the sketch reads the touch status. */
  i2c: string[];
}

// The round copper touch pad wired out from electrode 0, which circuit.ts
// leaves out.
export function singleTouchCell(o: SingleTouchLayout): Cell {
  const loopPrints: Print[] = TOUCHES.flatMap(([down, up]) => [
    { t: down + o.seen, text: 'Touched!' },
    { t: up + o.seen, text: 'Released!' },
  ]);
  // The previous loop's lines are on screen at t=0, matching the end state.
  const prints: Print[] = [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
  const press = { x: o.pad.x + o.pad.d / 2, y: o.pad.y + o.pad.d / 2 + 10 };
  return {
    duration: DURATION,
    extras: {
      parts: [padPart('PAD0', o.pad.x, o.pad.y, { scale: o.pad.d / 48, pin: o.padPin })],
      wires: [{ id: 'pad-0', from: ['TOUCH1', '0'], to: ['PAD0', 'e'], color: '#00aaaa', via: o.padVia }],
    },
    decor: {
      html: `
      <style>
        .${o.prefix}-big .k-serial-line { font-size: ${o.font}px; }
      </style>
      <div class="${o.prefix}-big">${serialPanel('out', o.serial, { note: o.baud, cableTo: o.usb })}</div>
      ${finger('f')}`,
      // The hovering finger reaches 96 + 26 px above the press point.
      bounds: [o.serial.x, Math.min(o.serial.y, press.y - 122), o.serial.x + o.serial.w, o.serial.y + o.serial.h],
    },
    activity: [{ wires: o.i2c, at: TOUCHES.flatMap(([down, up]) => [down + 8, up + 8]) }],
    run(t, view) {
      const touching = pressFinger(view, 'f', t, press, TOUCHES);
      setPad(view, 'PAD0', touching);
      view.glowWire('pad-0', touching ? 0.8 : 0);
      const pad = view.part<Mpr121>('TOUCH1');
      const isDown = pad.shadowRoot!.querySelector('[data-key="0"]')!.getAttribute('aria-pressed') === 'true';
      if (touching && !isDown) pad.down('0');
      if (!touching && isDown) pad.up('0');
      showSerial(view, 'out', t, prints, { board: o.board });
    },
  };
}

const PAD = { x: 128, y: -124, d: 56 };
export default singleTouchCell({
  prefix: 'c-mpr1',
  board: 'arduino-mega',
  usb: USB.mega,
  baud: '9600',
  // Up to one 10 ms poll, the I2C read, then about 10 ms of serial at 9600 baud.
  seen: 20,
  serial: { x: -262, y: USB.mega.y - 100, w: 212, h: 121 },
  font: 28,
  pad: PAD,
  padVia: [{ x: 344.4, y: -141 }, { x: 210, y: -141 }, { x: 210, y: PAD.y + PAD.d / 2 }],
  i2c: ['w-SDA', 'w-SCL'],
});
