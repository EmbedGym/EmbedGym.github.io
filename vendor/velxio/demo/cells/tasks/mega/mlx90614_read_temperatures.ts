import { clamp, easeInOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A mug of hot tea sits by the thermometer, then a glass of iced water takes
// its place. Every second the sketch reads the object and ambient registers
// over I2C and prints both.
export const DURATION = 6000;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];
const SWAP_OUT = [2700, 3100];
const SWAP_BACK = [5600, 6000];
const AMBIENT = '22.47';
const HOT = '80.25';
const COLD = '12.03';
const iceInFront = (t: number) => t >= SWAP_OUT[1] && t < SWAP_BACK[0];

/** The serial lines for readings at `reads` (each loop the same), with the previous loop's already on screen at t=0, matching the end state. */
export function printsFor(reads: number[]): Print[] {
  const loop: Print[] = reads.map((r) => ({
    t: r + 6,
    text: `Object: ${iceInFront(r) ? COLD : HOT} C Ambient: ${AMBIENT} C`,
  }));
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}
const PRINTS = printsFor(READS);
const PANEL = { x: -334, y: -100, w: 316, h: 180 };
const SPOT = { x: 270, y: -118 };

// How far an object is from its place: 0 = beside the sensor, 1 = lifted away.
// In each swap the outgoing object leaves before the incoming one arrives.
const half = (t: number, [a, b]: number[], second: boolean) =>
  easeInOutCubic(clamp((t - (second ? (a + b) / 2 : a)) / ((b - a) / 2)));

export function away(t: number, ice: boolean) {
  if (ice) return 1 - half(t, SWAP_OUT, true) + half(t, SWAP_BACK, false);
  return half(t, SWAP_OUT, false) - half(t, SWAP_BACK, true);
}

const mlx90614ReadTemperatures: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-read', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      <div style="position:absolute;left:${SPOT.x}px;top:${SPOT.y}px">${mug('mr-hot')}${mug('mr-ice', { kind: 'ice' })}</div>`,
    bounds: [PANEL.x, SPOT.y - 24, SPOT.x + 46, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    runMug(view, 'mr-hot', t, { away: away(t, false) });
    runMug(view, 'mr-ice', t, { away: away(t, true) });
    showSerial(view, 'mlx-read', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default mlx90614ReadTemperatures;
