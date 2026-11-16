import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A cloud drifts over the sun shining on the LTR390. The sketch reads the raw
// ambient-light (ALS) count once a second and prints it; the count drops while
// the cloud is in front of the sun.
export const DURATION = 5000;
export const READS = [125, 1125, 2125, 3125, 4125];
const SUNNY = 45000;

// 0 in full sun, 1 with the cloud right in front of it.
export function cover(t: number) {
  if (t < 1300 || t >= 3700) return 0;
  if (t < 1900) return easeInOutCubic((t - 1300) / 600);
  if (t < 3100) return 1;
  return 1 - easeInOutCubic((t - 3100) / 600);
}
const count = (t: number) => Math.round(SUNNY * (1 - 0.975 * cover(t)));

const LOOP_PRINTS: Print[] = READS.map((t) => ({ t: t + 5, text: `AL: ${count(t)}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -250, y: USB.mega.y - 137, w: 230, h: 147 };

const SUN = { x: 283.6, y: -156 };

const ltr390LightMeasure: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega })}
      ${sun('sun')}
      ${cloud('cloud')}`,
    bounds: [PANEL.x, SUN.y - 44, SUN.x + 90, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-20-SDA', 'w-21-SCL'], at: READS }],
  run(t, view) {
    const c = cover(t);
    setSun(view, 'sun', SUN, { brightness: 1 - 0.85 * c, turn: (t / DURATION) * 45 });
    // The cloud crosses the sun at a steady pace, fading in and out at the ends.
    const drift = clamp((t - 1300) / 2400);
    setCloud(view, 'cloud', { x: lerp(SUN.x - 30, SUN.x + 30, drift), y: SUN.y }, c);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default ltr390LightMeasure;
