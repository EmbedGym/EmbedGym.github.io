import { clamp, easeInOutCubic, easeOutCubic, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud } from '../../decor/sky';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A warm, humid breath drifts over the DHT11. The sketch reads it every 2 s
// and prints both values; the breath shows up in the next reading.
export const DURATION = 6000;
export const READS = [1000, 3000, 5000];
export const VALUES = [
  [24, 45],
  [31, 82],
  [27, 63],
];
const LOOP_PRINTS: Print[] = READS.map((t, i) => ({ t: t + 30, text: `Temperature: ${VALUES[i][0]} C, Humidity: ${VALUES[i][1]}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -322, y: -116, w: 308, h: 248 };

export const BREATH_IN = 1500;
export const BREATH_HOLD = 2300;
export const BREATH_OUT = 3300;
const CLOUD = { x: 290, y: -104 };

export function breath(t: number) {
  if (t < BREATH_IN || t >= BREATH_OUT) return 0;
  if (t < BREATH_IN + 400) return easeOutCubic((t - BREATH_IN) / 400);
  if (t < BREATH_HOLD) return 1;
  return 1 - easeInOutCubic((t - BREATH_HOLD) / (BREATH_OUT - BREATH_HOLD));
}

const dht11Read: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('dht11', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      ${cloud('dht', { kind: 'breath', scale: 0.8 })}`,
    bounds: [PANEL.x, PANEL.y, CLOUD.x + 116, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-14-DATA'], at: READS }],
  run(t, view) {
    const b = breath(t);
    // It drifts in from the right onto the sensor's grille, then thins away.
    const x = lerp(CLOUD.x + 20, CLOUD.x - 40, clamp((t - BREATH_IN) / (BREATH_OUT - BREATH_IN)));
    setCloud(view, 'dht', { x: x + 48, y: CLOUD.y + 26 }, b);
    showSerial(view, 'dht11', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default dht11Read;
