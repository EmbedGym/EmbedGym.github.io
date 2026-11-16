import { clamp, easeInOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A mug of warm tea (45 °C) is set beside the thermometer and taken away. Each
// second the sketch reads the object temperature, keeps the maximum and prints
// it with OK or HOT (30 °C and up); on the change to HOT it first prints
// "HOT object detected". The maximum carries over from earlier loops.
export const DURATION = 6000;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];
const PUT = [900, 1200];
const TAKE = [3700, 4000];
const ROOM = 24.2;
const MUG_TEMP = 45.0;
const mugThere = (t: number) => t >= PUT[1] && t < TAKE[0];
// 0 = beside the sensor, 1 = lifted away.
export const mugAway = (t: number) =>
  1 - easeInOutCubic(clamp((t - PUT[0]) / (PUT[1] - PUT[0]))) + easeInOutCubic(clamp((t - TAKE[0]) / (TAKE[1] - TAKE[0])));

/** The serial lines for readings at `reads` (each loop the same), with the previous loop's already on screen at t=0, matching the end state. */
export function printsFor(reads: number[]): Print[] {
  const loop: Print[] = reads.flatMap((r, i) => {
    const hot = mugThere(r);
    const line = { t: r + 6, text: `Object: ${(hot ? MUG_TEMP : ROOM).toFixed(1)} C Max: ${MUG_TEMP.toFixed(1)} C Status: ${hot ? 'HOT' : 'OK'}` };
    const turnedHot = hot && (i === 0 || !mugThere(reads[i - 1]));
    return turnedHot ? [{ t: r + 2, text: 'HOT object detected' }, line] : [line];
  });
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}
const PRINTS = printsFor(READS);
const PANEL = { x: -270, y: -110, w: 250, h: 248 };
const SPOT = { x: 270, y: -118 };

const mlx90614HotObjectMonitor: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-hot', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      <div style="position:absolute;left:${SPOT.x}px;top:${SPOT.y}px">${mug('mh')}</div>`,
    bounds: [PANEL.x, PANEL.y, SPOT.x + 46, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    runMug(view, 'mh', t, { away: mugAway(t) });
    showSerial(view, 'mlx-hot', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default mlx90614HotObjectMonitor;
