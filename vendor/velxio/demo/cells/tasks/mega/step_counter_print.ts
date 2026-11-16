import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { motion, setMotion } from '../../decor/motion';

// Three footfalls jolt the MPU6050 above 1.5 g. The sketch samples every 50 ms,
// counts a step when the magnitude crosses 1.5 g and re-arms below 1.2 g.
const DURATION = 3600;
const SAMPLE_MS = 50;
const SPIKES = [
  { at: 500, end: 800, g: 1.9 },
  { at: 1500, end: 1800, g: 1.8 },
  { at: 2500, end: 2800, g: 1.9 },
];
const ON_G = 1.5;

const gAt = (t: number) => SPIKES.find((s) => t >= s.at && t < s.end)?.g ?? 1;
// The first 50 ms sample after each jolt sees it; "Steps: N\r\n" takes ~1 ms.
const PRINTS: Print[] = SPIKES.map((s, i) => ({ t: s.at + SAMPLE_MS + 1, text: `Steps: ${i + 1}` }));

const PANEL = { x: -250, y: USB.mega.y - 90, w: 230, h: 150 };
// A strip chart of the sampled magnitude, right of the module and above its wire lanes.
const CHART = { x: 130, y: -170, w: 260, h: 122 };
const PLOT = { x: CHART.x + 14, y: CHART.y + 40, w: CHART.w - 28, h: CHART.h - 52 };
const G_MIN = 0.85;
const G_MAX = 2.0;
const plotX = (t: number) => PLOT.x + (PLOT.w * t) / DURATION;
const plotY = (g: number) => PLOT.y + PLOT.h * (1 - (g - G_MIN) / (G_MAX - G_MIN));

const stepCounterPrint: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-step-chart {
          position: absolute; left: ${CHART.x}px; top: ${CHART.y}px; width: ${CHART.w}px; height: ${CHART.h}px;
          box-sizing: border-box; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-step-title { position: absolute; left: 14px; top: 4px; font: 600 22px var(--sans); color: var(--muted); white-space: nowrap; }
        .c-step-title span { font-family: var(--mono); color: var(--ink); }
        .c-step-on { stroke: #94a3b8; stroke-width: 2; stroke-dasharray: 6 5; }
        .c-step-onlabel { position: absolute; font: 600 21px var(--mono); color: #64748b; white-space: nowrap; }
        .c-step-trace { fill: none; stroke: #0066ff; stroke-width: 3.5; stroke-linejoin: round; }
        .c-step-dot { fill: #0066ff; }
      </style>
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega })}
      <div class="c-step-chart"><div class="c-step-title">|a| <span data-k="g"></span></div></div>
      <div class="c-step-onlabel" style="left:${CHART.x + CHART.w - 78}px;top:${CHART.y + 6}px">1.5 g</div>
      <svg class="cell-air" viewBox="0 0 10 10">
        <line class="c-step-on" x1="${CHART.x + CHART.w - 112}" x2="${CHART.x + CHART.w - 84}" y1="${CHART.y + 21}" y2="${CHART.y + 21}" />
        <line class="c-step-on" x1="${PLOT.x}" x2="${PLOT.x + PLOT.w}" y1="${plotY(ON_G)}" y2="${plotY(ON_G)}" />
        <path class="c-step-trace" />
        <circle class="c-step-dot" r="5" />
      </svg>
      ${motion('jolt')}`,
    bounds: [PANEL.x, CHART.y, CHART.x + CHART.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    // The trace holds each 50 ms sample until the next, as the sketch sees it.
    const last = Math.floor(t / SAMPLE_MS) * SAMPLE_MS;
    let d = `M ${plotX(0)} ${plotY(gAt(0))}`;
    for (let s = SAMPLE_MS; s <= last; s += SAMPLE_MS) d += ` H ${plotX(s)} V ${plotY(gAt(s))}`;
    d += ` H ${plotX(t)}`;
    // Fully faded 50 ms before the seam, so the last frames match t=0.
    const fade = String(Math.min(clamp(t / 250), 1 - clamp((t - (DURATION - 350)) / 300)));
    const trace = view.q<SVGPathElement>('.c-step-trace');
    trace.setAttribute('d', d);
    trace.style.opacity = fade;
    const dot = view.q<SVGCircleElement>('.c-step-dot');
    dot.setAttribute('cx', String(plotX(t)));
    dot.setAttribute('cy', String(plotY(gAt(last))));
    dot.style.opacity = fade;
    const g = view.q<HTMLElement>('[data-k="g"]');
    g.textContent = `${gAt(last).toFixed(1)} g`;
    g.style.color = gAt(last) > ON_G ? '#0066ff' : '';

    // Jolt marks left of the module while a footfall shakes it.
    const imu = view.box('IMU1');
    const jolt = SPIKES.find((sp) => t >= sp.at && t < sp.end);
    const amount = jolt ? clamp((t - jolt.at) / 60) * clamp((jolt.end - t) / 60) : 0;
    setMotion(view, 'jolt', imu, amount, { sides: 'left' });

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: DURATION - 350 });
  },
  activity: [
    {
      wires: ['w-20-SDA', 'w-21-SCL'],
      at: Array.from({ length: DURATION / SAMPLE_MS }, (_, i) => i * SAMPLE_MS),
    },
  ],
};

export default stepCounterPrint;
