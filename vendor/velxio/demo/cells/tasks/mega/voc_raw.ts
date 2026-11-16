import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A bottle of solvent is opened beside the SGP40 and closed again. The sketch
// prints the sensor's raw gas signal every 1.25 s; the signal falls as the vapour
// reaches the sensor (more VOC reads lower) and recovers once the bottle is shut.
export const DURATION = 5000;
export const READS = [778, 2028, 3278, 4528];
const RAW = [30000, 24612, 21874, 26935];
const LOOP_PRINTS: Print[] = READS.map((t, i) => ({ t: t + 5, text: `VOC Raw: ${RAW[i]}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -270, y: USB.mega.y - 137, w: 250, h: 147 };

export const OPEN = 1100;
export const CLOSE = 3200;
const BOTTLE = { x: 130, y: -112 };

const bottleSvg = `
  <svg viewBox="0 0 54 76" width="54" height="76">
    <rect x="17" y="6" width="20" height="12" rx="2" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
    <path d="M 8 30 Q 8 18 20 18 H 34 Q 46 18 46 30 V 68 Q 46 74 40 74 H 14 Q 8 74 8 68 Z" fill="#e0f2fe" stroke="#64748b" stroke-width="2"/>
    <path d="M 10 44 H 44 V 68 Q 44 72 40 72 H 14 Q 10 72 10 68 Z" fill="#a5d8f3"/>
  </svg>`;
const capSvg = `
  <svg viewBox="0 0 30 20" width="30" height="20">
    <rect x="2" y="2" width="26" height="16" rx="3" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>
  </svg>`;

// 0 with the cap on, 1 with it off.
export function opened(t: number) {
  if (t < OPEN || t >= CLOSE + 300) return 0;
  if (t < OPEN + 300) return easeInOutCubic((t - OPEN) / 300);
  if (t < CLOSE) return 1;
  return 1 - easeInOutCubic((t - CLOSE) / 300);
}

// The raw signal's drop below clean air: it sinks towards 9450 while the bottle is open and recovers once it is shut.
function drop(t: number) {
  if (t < OPEN) return 0;
  const shut = 9450 * (1 - Math.exp(-(Math.min(t, CLOSE) - OPEN) / 1100));
  return t < CLOSE ? shut : shut * Math.exp(-(t - CLOSE) / 1370);
}
/** The SGP40's raw signal at `t` in the loop, the previous loop's recovery included. Clean air reads 30000. */
export const rawAt = (t: number) => Math.round(30000 - drop(t) - drop(t + DURATION));

/** The solvent bottle with its top-left at `at`, its cap and three vapour wisps; `prefix` keeps the class names the card's own. */
export function bottle(prefix: string, at: { x: number; y: number }) {
  return `
      <style>
        .${prefix}-bottle { position: absolute; left: ${at.x}px; top: ${at.y}px; }
        .${prefix}-cap { position: absolute; left: ${at.x + 12}px; top: ${at.y - 2}px; }
        .${prefix}-fume { fill: none; stroke: #8b5cf6; stroke-width: 4; stroke-linecap: round; }
      </style>
      <div class="${prefix}-bottle">${bottleSvg}</div>
      <svg class="cell-air" viewBox="0 0 10 10">
        ${`<path class="${prefix}-fume" />`.repeat(3)}
      </svg>
      <div class="${prefix}-cap">${capSvg}</div>`;
}

/** Lifts the cap while the bottle is open; vapour wisps rise from the neck and drift to `to`. */
export function runBottle(view: CellView, prefix: string, at: { x: number; y: number }, t: number, to: { x: number; y: number }) {
  const o = opened(t);
  view.q<HTMLElement>(`.${prefix}-cap`).style.transform = `translate(${-26 * o}px, ${-14 * o}px) rotate(${-30 * o}deg)`;
  const x0 = at.x + 27;
  const y0 = at.y + 4;
  view.qa<SVGPathElement>(`.${prefix}-fume`).forEach((fume, i) => {
    const phase = (t / 1200 + i / 3) % 1;
    const x = lerp(x0, to.x, phase);
    const y = lerp(y0, to.y, phase) - 18 * Math.sin(Math.PI * phase) + 6 * i;
    fume.setAttribute('d', `M ${x - 14} ${y} q 7 -8 14 0 t 14 0`);
    fume.style.opacity = String(clamp(o) * Math.sin(Math.PI * phase));
  });
}

const vocRaw: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega })}
      ${bottle('c-voc', BOTTLE)}`,
    bounds: [PANEL.x, BOTTLE.y - 40, BOTTLE.x + 54, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-20-SDA', 'w-21-SCL'], at: READS }],
  run(t, view) {
    // The vapour drifts right towards the sensor, stopping short of its power wire.
    runBottle(view, 'c-voc', BOTTLE, t, { x: view.box('GAS1').x - 38, y: BOTTLE.y + 4 });
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default vocRaw;
