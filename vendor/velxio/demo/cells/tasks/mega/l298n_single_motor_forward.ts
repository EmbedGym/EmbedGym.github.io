import type { Cell } from '../../cell';
import { motorPart, setMotor } from '../../decor/motor';

// The sketch sets IN1 high, IN2 low and ENA high (full duty) once at start-up,
// so Motor A runs forward at full speed for the whole loop. Every board tells
// the same story; only the driver's position differs.
const DURATION = 4000;

// Motor A, which circuit.ts leaves out: a TT gear motor seen from above,
// standing over the driver with its tyre on top and its terminals facing
// OUT1/OUT2, drawn 1.3 times life size of the line follower's.
const SCALE = 1.3;
// The terminals are spread to OUT1/OUT2's 21.6 px pitch so both wires drop straight.
const PIN_B = 13.7;
const PIN_A = 30.3;

/**
 * The card for one board: `out2` is the driver's OUT2 pin in cell coordinates,
 * `prefix` the board's own class prefix, `font` the tag's text size, `steps`
 * how many 8 px tread steps roll by per loop: a whole number, so the tread is
 * back in place at the restart.
 */
export function singleMotorCell(prefix: string, out2: { x: number; y: number }, font = 24, steps = 60): Cell {
  const motor = { x: out2.x - PIN_B * SCALE, y: out2.y - 20 - 100 * SCALE };
  const tag = { x: motor.x + 44 * SCALE + 16, y: motor.y + 12 };
  return {
    duration: DURATION,
    extras: {
      parts: [motorPart('MOTOR', motor.x, motor.y, { scale: SCALE, pitch: PIN_A - PIN_B, label: 'A' })],
      wires: [
        { id: 'motor-a', from: ['DRIVER', 'OUT2'], to: ['MOTOR', 'b'], color: '#00aaaa' },
        { id: 'motor-b', from: ['DRIVER', 'OUT1'], to: ['MOTOR', 'a'], color: '#aa00ff' },
      ],
    },
    decor: {
      html: `
        <style>
          .${prefix}-tag {
            position: absolute; padding: 8px 14px;
            display: flex; flex-direction: column; align-items: flex-start; white-space: nowrap;
            background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
            font-family: var(--sans); font-size: ${font}px; line-height: 1.25; font-weight: 700; color: var(--ink);
          }
          .${prefix}-tag b { color: var(--accent); }
        </style>
        <div class="${prefix}-tag" style="left:${tag.x}px;top:${tag.y}px">▲ forward<b>100%</b></div>`,
      bounds: [tag.x, tag.y, tag.x + (130 * font) / 24, tag.y + (80 * font) / 24],
    },
    run(t, view) {
      setMotor(view, 'MOTOR', (steps * 8 * t) / DURATION);
      view.glowWire('w-IN1', 1);
      view.glowWire('w-ENA', 1);
      view.glowWire('motor-a', 0.6);
      view.glowWire('motor-b', 0.6);
    },
  };
}

export default singleMotorCell('c-l298f', { x: 493.6, y: -115.5 });
