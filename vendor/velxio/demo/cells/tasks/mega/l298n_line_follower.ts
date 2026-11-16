import { clamp, easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { motorPart, setMotor } from '../../decor/motor';

type LineSensor = HTMLElement & {
  showIndicators(high: readonly boolean[], powered: boolean): void;
};

// The black line drifts under the sensor: centre → left channel → centre →
// right channel → off the sensor (line lost) → back to centre. A channel over the line reads HIGH. Each pass of
// loop() reads the three channels, sets the motor PWM, queues one line and
// waits 100 ms, so a line goes out every 100 ms (measured).
const DURATION = 6000;
// Line centre along the sensor, in the sensor's own units (channels at 37.6 / 124.8 / 212).
const CHANNELS = [37.6, 124.8, 212];
const KEYS: [number, number][] = [
  [0, 124.8],
  [500, 124.8],
  [1000, 37.6],
  [1800, 37.6],
  [2300, 124.8],
  [2800, 212],
  [3500, 212],
  [3900, 300],
  [4700, 300],
  [5500, 124.8],
  [DURATION, 124.8],
];
function lineAt(t: number) {
  for (let i = 1; i < KEYS.length; i++) {
    const [t0, u0] = KEYS[i - 1];
    const [t1, u1] = KEYS[i];
    if (t <= t1) return lerp(u0, u1, easeInOutCubic(progress(t, t0, t1 - t0)));
  }
  throw new Error(`lineAt: t ${t} is past the loop`);
}
// The tape is 70 units wide; a channel sees it while its spot overlaps the tape.
const TAPE = 70;
const SEES = TAPE / 2 + 15;
const readChannels = (t: number) => CHANNELS.map((c) => Math.abs(lineAt(t) - c) < SEES);

// The sketch's choice for each reading, with its analogWrite duties (left = ENA, right = ENB).
function decide([left, middle, right]: boolean[]) {
  if (middle) return { action: 'forward', duty: [190, 220] };
  if (left && !right) return { action: 'right', duty: [190, 80] };
  if (right && !left) return { action: 'left', duty: [60, 220] };
  if (!left && !right) return { action: 'stop', duty: [0, 0] };
  return { action: 'forward', duty: [190, 220] };
}

const PERIOD = 100;
// The 41-byte line takes 42 ms at 9600 baud.
const SEND = 42;
const LOOP_PRINTS: Print[] = Array.from({ length: DURATION / PERIOD }, (_, k) => {
  const reading = readChannels(k * PERIOD);
  const [l, m, r] = reading.map(Number);
  return {
    t: k * PERIOD + SEND,
    text: `Left: ${l} Mid: ${m} Right: ${r} Action: ${decide(reading).action}`,
  };
});
// The previous loop's lines are on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
// The duty in force at t: set by the latest read.
const dutyAt = (t: number) => decide(readChannels(Math.floor(t / PERIOD) * PERIOD)).duty;

// Each tyre's tread scrolls by its wheel's running turn, scaled so the loop
// ends on a whole tread step.
const TREAD = 8;
const STEP = 5;
const RAW: number[][] = [[0, 0]];
for (let t = STEP; t <= DURATION; t += STEP) {
  const last = RAW[RAW.length - 1];
  const duty = dutyAt(t);
  RAW.push([last[0] + (duty[0] / 255) * STEP, last[1] + (duty[1] / 255) * STEP]);
}
const treadAt = (t: number, side: number) => {
  const total = RAW[RAW.length - 1][side];
  const travel = TREAD * Math.round((total * 0.05) / TREAD);
  return (RAW[Math.min(RAW.length - 1, Math.floor(t / STEP))][side] / total) * travel;
};

// The two drive motors, which circuit.ts leaves out: TT gear motors seen from
// above, standing with the tyre on top and the terminals at the bottom, left
// of the driver: motor A (left wheel, OUT1/OUT2) on the left, motor B (right
// wheel, OUT3/OUT4) on the right. Each has a speed bar on its right whose
// fill is its PWM duty, with an arrow while it drives forward.
const MOTOR_A = { x: -336, y: -130 };
const MOTOR_B = { x: -264, y: -130 };
const BAR = { dx: 50, y: -110, w: 12, h: 80 };
const ACTION = { x: -336, y: -142 };

const SERIAL = { x: -336, y: 26, w: 328, h: 162 };

/**
 * The card for a board placed where the Mega is, with the driver and motors at
 * the Mega's positions. `prefix` is the board's own class prefix; `sensor` is
 * the line sensor's top-left in cell coordinates (the floor strip sits above it);
 * `font` the serial and action text size.
 */
export function lineFollowerCell(prefix: string, board: string, usb: UsbPort, sensor: { x: number; y: number }, font = 29): Cell {
  const p = prefix;
  // The floor in front of the sensor, with the black tape crossing it.
  const floor = { x: sensor.x, y: sensor.y - 41, w: 249.4, h: 32 };
  // The panel grows with the font, keeping its right edge at the socket.
  const k = font / 29;
  const serial = { x: SERIAL.x + SERIAL.w * (1 - k), y: SERIAL.y, w: SERIAL.w * k, h: SERIAL.h * k };
  const barSvg = (key: string, motor: { x: number; y: number }) => {
    const x = motor.x + BAR.dx;
    return `
    <rect class="${p}-wheel-bar" x="${x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="3"/>
    <rect class="${p}-wheel-fill" data-bar="${key}" x="${x}" y="${BAR.y}" width="${BAR.w}" height="0" rx="3"/>
    <path class="${p}-dir" data-dir="${key}" d="M ${x + BAR.w / 2} ${BAR.y - 18} l 8 12 h -16 z"/>`;
  };
  return {
    duration: DURATION,
    extras: {
      parts: [motorPart('MOTOR_A', MOTOR_A.x, MOTOR_A.y, { label: 'L' }), motorPart('MOTOR_B', MOTOR_B.x, MOTOR_B.y, { label: 'R' })],
      wires: [
        {
          id: 'motor-b-a',
          from: ['DRIVER', 'OUT4'],
          to: ['MOTOR_B', 'a'],
          color: '#aa00ff',
          via: [
            { x: -76.2, y: -166 },
            { x: -194, y: -166 },
            { x: -194, y: -16 },
            { x: -235, y: -16 },
          ],
        },
        {
          id: 'motor-b-b',
          from: ['DRIVER', 'OUT3'],
          to: ['MOTOR_B', 'b'],
          color: '#00aaaa',
          via: [
            { x: -54.6, y: -174 },
            { x: -186, y: -174 },
            { x: -186, y: -8 },
            { x: -249, y: -8 },
          ],
        },
        {
          id: 'motor-a-a',
          from: ['DRIVER', 'OUT1'],
          to: ['MOTOR_A', 'a'],
          color: '#aa00ff',
          via: [
            { x: -76.2, y: 10 },
            { x: -307, y: 10 },
          ],
        },
        {
          id: 'motor-a-b',
          from: ['DRIVER', 'OUT2'],
          to: ['MOTOR_A', 'b'],
          color: '#00aaaa',
          via: [
            { x: -54.6, y: 18 },
            { x: -321, y: 18 },
          ],
        },
      ],
    },
    decor: {
      html: `
      <style>
        .${p}-floor { fill: #f4f1ea; stroke: #cfd6df; stroke-width: 1.5; }
        .${p}-tape { fill: #1f2328; }
        .${p}-wheel-bar { fill: #eef2f6; stroke: #cfd6df; stroke-width: 1.5; }
        .${p}-wheel-fill { fill: var(--accent); }
        .${p}-dir { fill: var(--accent); }
        .${p}-action { position: absolute; left: ${ACTION.x}px; top: ${ACTION.y - 34 - (font - 29)}px; font: 700 ${font}px var(--sans); color: var(--ink); white-space: nowrap; }
      </style>
      ${serialPanel('out', serial, { note: '9600', cableTo: usb, wrap: true, fontSize: font })}
      <svg class="cell-air" viewBox="0 0 10 10">
        <defs><clipPath id="${p}-floor"><rect x="${floor.x}" y="${floor.y}" width="${floor.w}" height="${floor.h}" rx="6"/></clipPath></defs>
        <rect class="${p}-floor" x="${floor.x}" y="${floor.y}" width="${floor.w}" height="${floor.h}" rx="6"/>
        <rect class="${p}-tape" clip-path="url(#${p}-floor)" y="${floor.y}" height="${floor.h}" width="${TAPE}"/>
        ${barSvg('a', MOTOR_A)}
        ${barSvg('b', MOTOR_B)}
      </svg>
      <div class="${p}-action"></div>`,
      bounds: [serial.x, floor.y - 1, floor.x + floor.w + 1, serial.y + serial.h],
    },
    run(t, view) {
      // Trimmed to the floor so a tape that has run off it leaves nothing outside.
      const x0 = Math.max(floor.x, sensor.x + lineAt(t) - TAPE / 2);
      const x1 = Math.min(floor.x + floor.w, sensor.x + lineAt(t) + TAPE / 2);
      const tape = view.q<SVGRectElement>(`.${p}-tape`);
      tape.setAttribute('x', String(x0));
      tape.setAttribute('width', String(Math.max(0, x1 - x0)));
      const reading = readChannels(t);
      view.part<LineSensor>('SENSOR').showIndicators(reading, true);
      ['w11', 'w12', 'w13'].forEach((id, i) => view.glowWire(id, reading[i] ? 1 : 0));

      const [left, right] = dutyAt(t).map((d) => d / 255);
      view.q<HTMLElement>(`.${p}-action`).textContent = decide(readChannels(Math.floor(t / PERIOD) * PERIOD)).action;
      (['a', 'b'] as const).forEach((key, i) => {
        const level = [left, right][i];
        const fill = view.q<SVGRectElement>(`[data-bar="${key}"]`);
        fill.setAttribute('y', String(BAR.y + BAR.h * (1 - level)));
        fill.setAttribute('height', String(BAR.h * level));
        view.q<SVGPathElement>(`[data-dir="${key}"]`).style.opacity = level > 0 ? '1' : '0.15';
      });
      view.glowWire('w0', 1);
      view.glowWire('w3', 1);
      view.glowWire('w2', clamp(left));
      view.glowWire('w5', clamp(right));
      for (const id of ['motor-a-a', 'motor-a-b']) view.glowWire(id, 0.6 * left);
      for (const id of ['motor-b-a', 'motor-b-b']) view.glowWire(id, 0.6 * right);
      setMotor(view, 'MOTOR_A', treadAt(t, 0));
      setMotor(view, 'MOTOR_B', treadAt(t, 1));
      showSerial(view, 'out', t, PRINTS, { board });
      // A line arrives every 100 ms, faster than the kit's 180 ms slide-in, so
      // the lines stay put and only the highlight marks each new one.
      view.q<HTMLElement>('[data-serial="out"] .k-serial-lines').style.transform = 'none';
    },
  };
}

export default lineFollowerCell('c-l298l', 'arduino-mega', USB.mega, {
  x: 291.6,
  y: -135,
});
