import { easeInOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { glow, setGlow } from '../../decor/glow';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A hot mug is set down beside the AMG8833 and taken away again. The sketch reads
// the module's own thermistor once a second and prints it, so the readings climb
// while the mug is there and fall back after.
export const DURATION = 6000;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];
const TEMPS = ['22.5', '23.5', '25.0', '26.0', '25.0', '23.5'];
const LOOP_PRINTS: Print[] = READS.map((t, i) => ({ t: t + 5, text: `Ambient Temperature: ${TEMPS[i]} C` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -360, y: USB.mega.y - 150, w: 340, h: 181 };

const MUG_IN = 700;
const MUG_OUT = 3600;
const MUG = { x: 169, y: -149 };
const MUG_SCALE = 1.8;
// The mug's heat, between it and the sensor.
const HEAT = { x: 263, y: -69 };

export function present(t: number) {
  if (t < MUG_IN || t >= MUG_OUT + 400) return 0;
  if (t < MUG_IN + 400) return easeInOutCubic((t - MUG_IN) / 400);
  if (t < MUG_OUT) return 1;
  return 1 - easeInOutCubic((t - MUG_OUT) / 400);
}

const amg8833AmbientThermistorRead: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      ${glow('heat', { tone: 'heat', scale: 1.4 })}
      <div style="position:absolute;left:${MUG.x}px;top:${MUG.y}px">${mug('mug', { scale: MUG_SCALE })}</div>`,
    bounds: [PANEL.x, MUG.y - 20, MUG.x + 46 * MUG_SCALE, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    const p = present(t);
    runMug(view, 'mug', t, { away: 1 - p, dx: -60, dy: 0 });
    setGlow(view, 'heat', HEAT, p);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default amg8833AmbientThermistorRead;
