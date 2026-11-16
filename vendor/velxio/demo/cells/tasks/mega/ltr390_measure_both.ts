import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A cloud drifts over the sun shining on the LTR390. About once a second the
// sketch puts the sensor in UVS mode and reads the UV count, switches to ALS mode
// and reads the ambient-light count, then prints both. The cloud blocks most of
// the visible light but little of the UV, so AL drops far more than UV.
export const DURATION = 6000;
// Each pass waits for two fresh conversions, so prints come about 1.2 s apart.
export const READS = [238, 1444, 2650, 3856, 5062];

// 0 in full sun, 1 with the cloud right in front of it.
export function cover(t: number) {
  if (t < 1700 || t >= 4500) return 0;
  if (t < 2300) return easeInOutCubic((t - 1700) / 600);
  if (t < 3900) return 1;
  return 1 - easeInOutCubic((t - 3900) / 600);
}
const count = (t: number, sunny: number, blocked: number) => Math.round(sunny * (1 - blocked * cover(t)));

const LOOP_PRINTS: Print[] = READS.map((t) => ({ t: t + 5, text: `UV: ${count(t, 1200, 0.3)}, AL: ${count(t, 45000, 0.8)}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -330, y: USB.mega.y - 137, w: 310, h: 147 };

const SUN = { x: 283.6, y: -156 };
// One conversion takes about 100 ms: UVS, then ALS, then the print. The sensor stays in ALS mode until the next pass.
export const CONVERSION = 103;
const MODE = { x: 106, y: -213 };
export const uvsMode = (t: number) => READS.some((r) => t >= r - 2 * CONVERSION && t < r - CONVERSION);

/**
 * The sensor's mode, UVS or ALS, as a small panel with its top-left at `at`.
 * `prefix` keeps each card's class names its own; rows are `font` px text.
 */
export function modePanel(prefix: string, at: { x: number; y: number }, font = 25) {
  const row = Math.round(1.36 * font);
  // Header, two rows with 8 px round each, plus the borders.
  const w = Math.round((112 * font) / 25);
  const h = 34 + 3 * 8 + 2 * row + 2;
  const html = `
      <style>
        .${prefix}-mode { left: ${at.x}px; top: ${at.y}px; width: ${w}px; height: ${h}px; }
        .${prefix}-row { margin: 8px 8px 0; padding: 0 8px; border-radius: 8px; font: 600 ${font}px/${row}px var(--mono); color: var(--muted); }
        .${prefix}-row.on { background: var(--accent); color: #fff; }
      </style>
      <div class="k-serial ${prefix}-mode">
        <div class="k-serial-head"><span>Mode</span></div>
        <div class="${prefix}-row" data-mode="uvs">UVS</div>
        <div class="${prefix}-row" data-mode="als">ALS</div>
      </div>`;
  return { html, w, h };
}

/** Lights the mode the sensor is in at `t`. */
export function showMode(view: CellView, t: number) {
  const uvs = uvsMode(t);
  view.q<HTMLElement>('[data-mode="uvs"]').classList.toggle('on', uvs);
  view.q<HTMLElement>('[data-mode="als"]').classList.toggle('on', !uvs);
}
const MODE_PANEL = modePanel('c-ltb', MODE);

const ltr390MeasureBoth: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega })}
      ${sun('sun', { rays: 'both' })}
      ${cloud('cloud')}
      ${MODE_PANEL.html}`,
    bounds: [PANEL.x, MODE.y, SUN.x + 90, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-20-SDA', 'w-21-SCL'], at: READS }],
  run(t, view) {
    const c = cover(t);
    // Alternating rays repeat every 90°, so a quarter turn a loop keeps the seam still.
    setSun(view, 'sun', SUN, { brightness: 1 - 0.85 * c, turn: (t / DURATION) * 90 });
    // The cloud crosses the sun at a steady pace, fading in and out at the ends.
    const drift = clamp((t - 1700) / 2800);
    setCloud(view, 'cloud', { x: lerp(SUN.x - 30, SUN.x + 30, drift), y: SUN.y }, c);
    showMode(view, t);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default ltr390MeasureBoth;
