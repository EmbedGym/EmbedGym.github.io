import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { motorPart, setMotor } from '../../decor/motor';

// The sketch starts Motor A forward at 25% and steps 25 → 50 → 75 → 100 → 25
// on each debounced press, printing the new speed. Four presses bring it back
// to 25%, so the loop restarts where it began.
const DURATION = 5200;
const PRESSES: [number, number][] = [
  [500, 760],
  [1800, 2060],
  [3100, 3360],
  [4400, 4660],
];
const SPEEDS = [50, 75, 100, 25];
const TREAD = 8;
const STEP = 5;

/** `lag`: press to speed change, ms; `printMs`: how long the line takes to send. */
function timeline(lag: number, printMs: number) {
  const loopPrints: Print[] = PRESSES.map(([down], i) => ({
    t: down + lag + printMs,
    text: `speed_percent=${SPEEDS[i]}`,
  }));
  // The previous loop's lines are on screen at t=0, matching the end state.
  const prints: Print[] = [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
  const dutyAt = (t: number) => {
    let duty = 25;
    PRESSES.forEach(([down], i) => {
      if (t >= down + lag) duty = SPEEDS[i];
    });
    return duty / 100;
  };
  // The motor's speed follows the duty with a short spin-up/down; the tread's
  // travel is its running integral, scaled so the loop ends on a whole tread step.
  const raw: number[] = [0];
  let speed = 0.25;
  for (let t = STEP; t <= DURATION; t += STEP) {
    speed += (dutyAt(t) - speed) * (1 - Math.exp(-STEP / 120));
    raw.push(raw[raw.length - 1] + speed * STEP);
  }
  const total = raw[raw.length - 1];
  const travel = TREAD * Math.round((total * 0.025) / TREAD);
  const treadAt = (t: number) => (raw[Math.min(raw.length - 1, Math.floor(t / STEP))] / total) * travel;
  return { prints, dutyAt, treadAt };
}

type Point = { x: number; y: number };

// Motor A, which circuit.ts leaves out: a TT gear motor seen from above,
// standing with its tyre on top and its terminals at the bottom, its wires
// coming from OUT1/OUT2. A speed bar on its left fills with the PWM duty.
const SCALE = 1.15;
const BAR = { w: 12, h: 80 };
const TAG = { w: 210, h: 52, font: 30 };

export interface ButtonCycleLayout {
  /** The board's own class prefix, board id and console socket. */
  prefix: string;
  board: string;
  usb: UsbPort;
  serial: { x: number; y: number; w: number; h: number };
  /** The motor's top-left, the speed tag's top-left, and the corners of the two motor wires. */
  motor: Point;
  tag: Point;
  viaA: Point[];
  viaB: Point[];
  /** Serial and tag text sizes; the small-scale boards need them larger to stay readable. */
  font?: number;
  tagFont?: number;
  /**
   * Press to speed change and line send time, ms. Defaults: the AVR sketch's
   * 30 ms steady debounce and 19 ms per line at 9600 baud. `baud` is the panel note.
   */
  lag?: number;
  printMs?: number;
  baud?: string;
  /** `top` for a motor whose wires come from above (see motorPart). */
  motorPins?: 'bottom' | 'top';
  /** The speed bar's top-left; default just left of the motor. */
  bar?: Point;
}

export function buttonCycleCell(o: ButtonCycleLayout): Cell {
  const p = o.prefix;
  const { prints, dutyAt, treadAt } = timeline(o.lag ?? 30, o.printMs ?? 19);
  const font = o.font ?? 28;
  const bar = o.bar ?? { x: o.motor.x - 20, y: o.motor.y + 25 };
  const k = (o.tagFont ?? TAG.font) / TAG.font;
  const tag = { w: TAG.w * k, h: TAG.h * k };
  return {
    duration: DURATION,
    extras: {
      parts: [motorPart('MOTOR', o.motor.x, o.motor.y, { scale: SCALE, label: 'A', pins: o.motorPins })],
      wires: [
        {
          id: 'motor-a',
          from: ['DRIVER', 'OUT1'],
          to: ['MOTOR', 'a'],
          color: '#00aaaa',
          via: o.viaA,
        },
        {
          id: 'motor-b',
          from: ['DRIVER', 'OUT2'],
          to: ['MOTOR', 'b'],
          color: '#aa00ff',
          via: o.viaB,
        },
      ],
    },
    decor: {
      html: `
        <style>
          .${p}-big .k-serial-line { font-size: ${font}px; }
          .${p}-big .k-serial-head { font-size: ${Math.min(font - 4, 24)}px; }
          .${p}-tag {
            position: absolute; height: ${tag.h}px; width: ${tag.w}px; padding: 0 ${16 * k}px;
            display: flex; align-items: center; justify-content: space-between; gap: 12px; white-space: nowrap; box-sizing: border-box;
            background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
            font-family: var(--sans); font-size: ${TAG.font * k}px; font-weight: 700; color: var(--ink);
          }
          .${p}-tag b { color: var(--accent); font-family: var(--mono); }
          .${p}-bar { fill: #eef2f6; stroke: #cfd6df; stroke-width: 1.5; }
          .${p}-fill { fill: var(--accent); }
        </style>
        <div class="${p}-big">${serialPanel('out', o.serial, { note: o.baud ?? '9600', cableTo: o.usb })}</div>
        <div class="${p}-tag" style="left:${o.tag.x}px;top:${o.tag.y}px">speed <b class="${p}-pct">25%</b></div>
        <svg class="cell-air" viewBox="0 0 10 10">
          <rect class="${p}-bar" x="${bar.x}" y="${bar.y}" width="${BAR.w}" height="${BAR.h}" rx="3"/>
          <rect class="${p}-fill" x="${bar.x}" width="${BAR.w}" rx="3"/>
          <path class="${p}-fill" d="M ${bar.x + BAR.w / 2} ${bar.y - 18} l 8 12 h -16 z"/>
        </svg>
        ${finger('f')}`,
      bounds: [
        Math.min(o.serial.x, o.tag.x, bar.x),
        Math.min(o.serial.y, o.tag.y, bar.y - 18),
        Math.max(o.serial.x + o.serial.w, o.tag.x + tag.w, bar.x + BAR.w),
        Math.max(o.serial.y + o.serial.h, o.tag.y + tag.h, bar.y + BAR.h),
      ],
    },
    run(t, view) {
      const btn = view.box('BUTTON');
      const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 };
      const pressing = pressFinger(view, 'f', t, cap, PRESSES);
      view.part<HTMLElement & { pressed: boolean }>('BUTTON').pressed = pressing;
      if (pressing) {
        view.glowWire('w-button-signal', 1);
        view.glowWire('w-pulldown-signal', 1);
      }
      const duty = dutyAt(t);
      view.q<HTMLElement>(`.${p}-pct`).textContent = `${Math.round(duty * 100)}%`;
      setMotor(view, 'MOTOR', treadAt(t));
      const fill = view.q<SVGRectElement>(`rect.${p}-fill`);
      fill.setAttribute('y', String(bar.y + BAR.h * (1 - duty)));
      fill.setAttribute('height', String(BAR.h * duty));
      view.glowWire('w-IN1', 1);
      // ENA carries the PWM; its glow follows the duty.
      view.glowWire('w-ENA', clamp(duty));
      view.glowWire('motor-a', 0.6 * duty);
      view.glowWire('motor-b', 0.6 * duty);
      showSerial(view, 'out', t, prints, { board: o.board });
    },
  };
}

const MOTOR = { x: -110, y: -90 - 100 * SCALE };
export default buttonCycleCell({
  prefix: 'c-l298b',
  board: 'arduino-mega',
  usb: USB.mega,
  serial: { x: -370, y: USB.mega.y - 88, w: 320, h: 121 },
  motor: MOTOR,
  tag: { x: -354, y: -120.4 },
  viaA: [
    { x: 28, y: -105.2 },
    { x: 28, y: -82 },
    { x: MOTOR.x + 29 * SCALE, y: -82 },
  ],
  viaB: [
    { x: 36, y: -83.6 },
    { x: 36, y: -74 },
    { x: MOTOR.x + 15 * SCALE, y: -74 },
  ],
});
