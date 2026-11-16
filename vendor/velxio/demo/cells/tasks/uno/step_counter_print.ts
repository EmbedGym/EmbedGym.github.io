import { clamp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { motion, setMotion, type MotionSides } from '../../decor/motion';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// As the Mega card: three footfalls jolt the MPU6050 above 1.5 g. The firmware samples every 50 ms,
// counts a step when the magnitude crosses 1.5 g and re-arms below 1.2 g.
export const DURATION = 3600;
const SAMPLE_MS = 50;
const SPIKES = [
  { at: 500, end: 800, g: 1.9 },
  { at: 1500, end: 1800, g: 1.8 },
  { at: 2500, end: 2800, g: 1.9 },
];
const ON_G = 1.5;
const G_MIN = 0.85;
const G_MAX = 2.0;

const gAt = (t: number) => SPIKES.find((s) => t >= s.at && t < s.end)?.g ?? 1;
// The first 50 ms sample after each jolt sees it; "Steps: N" takes ~1 ms to go out.
export const PRINTS: Print[] = SPIKES.map((s, i) => ({ t: s.at + SAMPLE_MS + 1, text: `Steps: ${i + 1}` }));
export const SAMPLES = Array.from({ length: DURATION / SAMPLE_MS - 1 }, (_, i) => (i + 1) * SAMPLE_MS);

/** The chart's size for `font` px text (the Mega's 260 x 122 at 22 px). */
export const chartSize = (font: number) => ({ w: Math.round((260 * font) / 22), h: Math.round((122 * font) / 22) });

/**
 * A strip chart of the sampled magnitude with the 1.5 g threshold, its top-left at (x, y), and shake
 * marks on the `sides` of IMU1 while a footfall jolts it. `prefix` keeps the element keys the card's own.
 */
export function stepScene(prefix: string, at: { x: number; y: number }, font: number, sides: MotionSides) {
  const k = font / 22;
  const { w, h } = chartSize(font);
  const plot = { x: at.x + 14 * k, y: at.y + 40 * k, w: w - 28 * k, h: h - 52 * k };
  const plotX = (t: number) => plot.x + (plot.w * t) / DURATION;
  const plotY = (g: number) => plot.y + plot.h * (1 - (g - G_MIN) / (G_MAX - G_MIN));
  const dash = `stroke="#94a3b8" stroke-width="${2 * k}" stroke-dasharray="${6 * k} ${5 * k}"`;
  const html = `
    <div style="position:absolute;left:${at.x}px;top:${at.y}px;width:${w}px;height:${h}px;box-sizing:border-box;background:#f8fafc;border:1.5px solid #cfd6df;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,0.08)">
      <div style="position:absolute;left:${14 * k}px;top:${4 * k}px;font:600 ${font}px var(--sans);color:var(--muted);white-space:nowrap">|a| <span data-${prefix}-g style="font-family:var(--mono);color:var(--ink)"></span></div>
    </div>
    <div style="position:absolute;left:${at.x + w - 78 * k}px;top:${at.y + 6 * k}px;font:600 ${font}px var(--mono);color:#64748b;white-space:nowrap">1.5 g</div>
    <svg class="cell-air" viewBox="0 0 10 10">
      <line ${dash} x1="${at.x + w - 112 * k}" x2="${at.x + w - 84 * k}" y1="${at.y + 21 * k}" y2="${at.y + 21 * k}" />
      <line ${dash} x1="${plot.x}" x2="${plot.x + plot.w}" y1="${plotY(ON_G)}" y2="${plotY(ON_G)}" />
      <path data-${prefix}-trace fill="none" stroke="#0066ff" stroke-width="${3.5 * k}" stroke-linejoin="round" />
      <circle data-${prefix}-dot fill="#0066ff" r="${5 * k}" />
    </svg>
    ${motion(`${prefix}-jolt`)}`;
  const run = (view: CellView, t: number) => {
    // The trace holds each 50 ms sample until the next, as the firmware sees it.
    const last = Math.floor(t / SAMPLE_MS) * SAMPLE_MS;
    let d = `M ${plotX(0)} ${plotY(gAt(0))}`;
    for (let s = SAMPLE_MS; s <= last; s += SAMPLE_MS) d += ` H ${plotX(s)} V ${plotY(gAt(s))}`;
    d += ` H ${plotX(t)}`;
    const fade = String(Math.min(clamp(t / 250), 1 - clamp((t - (DURATION - 300)) / 300)));
    const trace = view.q<SVGPathElement>(`[data-${prefix}-trace]`);
    trace.setAttribute('d', d);
    trace.style.opacity = fade;
    const dot = view.q<SVGCircleElement>(`[data-${prefix}-dot]`);
    dot.setAttribute('cx', String(plotX(t)));
    dot.setAttribute('cy', String(plotY(gAt(last))));
    dot.style.opacity = fade;
    const g = view.q<HTMLElement>(`[data-${prefix}-g]`);
    g.textContent = `${gAt(last).toFixed(1)} g`;
    g.style.color = gAt(last) > ON_G ? '#0066ff' : '';
    const jolt = SPIKES.find((sp) => t >= sp.at && t < sp.end);
    const amount = jolt ? clamp((t - jolt.at) / 60) * clamp((jolt.end - t) / 60) : 0;
    setMotion(view, `${prefix}-jolt`, view.box('IMU1'), amount, { sides });
  };
  return { html, run, w, h };
}

const FONT = 25;
// Two readings, one row each: 34 + 2 x 34 + 10.
const PANEL = { x: -316, y: 0, w: 296, h: 112 };
const SCENE = stepScene('su', { x: PANEL.x, y: 130 }, FONT, 'left');

const stepCounterPrintUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.uno, fontSize: FONT })}
      ${SCENE.html}`,
    bounds: [PANEL.x, 0, 282, 307],
  },
  activity: [{ wires: ['w-A4-SDA', 'w-A5-SCL'], at: SAMPLES }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno', fadeFrom: DURATION - 300 });
  },
};

export default stepCounterPrintUno;
