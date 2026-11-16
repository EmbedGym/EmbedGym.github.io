import { clamp, easeInOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { BLUE_TINT } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { setVibration, vibration } from '../../decor/vibration';

type Haptic = HTMLElement & { vibrating: boolean };

// The board is turned in three steps. The sketch only changes sector once the
// heading is 5° past a boundary: 25° stays N, 60° enters NE (click, effect 1),
// and coming back past 17.5° enters N (buzz, effect 47). It prints the heading
// once a second.
export const DURATION = 6000;
export const TURNS = [
  { at: 700, ms: 300, to: 25 },
  { at: 1700, ms: 300, to: 60 },
  { at: 3700, ms: 400, to: -10 },
];
const HEADING_AT_0 = -10;
export function headingAt(t: number) {
  let h = HEADING_AT_0;
  for (const turn of TURNS) h += (turn.to - h) * easeInOutCubic(clamp((t - turn.at) / turn.ms));
  return (h + 360) % 360;
}
export const show = (h: number) => (h + 360) % 360;

// Sketch times from the turns above: the first ~15 Hz sample past 27.5° and past 17.5°.
const ENTRIES = [
  { t: 1800, sector: 'NE', effect: 'click' },
  { t: 3940, sector: 'N', effect: 'buzz' },
];
export const EFFECT_MS = 100;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];
const sectorAt = (t: number) => (t >= ENTRIES[0].t && t < ENTRIES[1].t ? 'NE' : 'N');

const LOOP_PRINTS: Print[] = [
  ...READS.map((r) => ({ t: r + 2, text: `Heading: ${show(headingAt(r)).toFixed(1)} Sector: ${sectorAt(r)}` })),
  ...ENTRIES.map((e) => ({ t: e.t + 1, text: `Entered ${e.sector}` })),
].sort((a, b) => a.t - b.t);
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

const SERIAL = { x: -402, y: -150, w: 280, h: 44 + 5 * 27 * 1.36 };
const PANEL = { x: -20, y: -170, w: 202, h: 132 };
const DIAL = { cx: 52, cy: 66 };
// Vibration arcs either side of the motor disc, centred on it.
const MOTOR = { dx: 48, dy: 20 };



const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-hc-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-hc-title { position: absolute; right: 10px; top: 4px; font: 600 26px var(--sans); color: var(--muted); }
        /* Same fill as the lit wedge, so the name reads as that wedge's label. */
        .c-hc-sector { position: absolute; left: 118px; top: 42px; padding: 0 8px; border-radius: 8px; font: 700 32px/44px var(--mono); color: var(--accent); background: ${BLUE_TINT}; }
        .c-hc-effect {
          position: absolute; left: 118px; top: 92px; padding: 0 6px; border-radius: 8px;
          font: 700 26px/36px var(--sans); color: #fff; background: var(--accent);
        }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega, wrap: true, fontSize: 27 })}
      <div class="c-hc-panel">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('heading', { pointer: 'needle', sectors: true, hysteresis: 5 })}</div>
        <div class="c-hc-title">heading</div>
        <div class="c-hc-sector"></div>
        <div class="c-hc-effect"></div>
      </div>
      <div class="c-hc-motor" style="position:absolute">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, PANEL.y, PANEL.x + PANEL.w, SERIAL.y + SERIAL.h],
  },
  activity: [
    { wires: ['w-20-MAG1-SDA', 'w-21-MAG1-SCL'], at: [...READS, ...ENTRIES.map((e) => e.t)] },
    { wires: ['w-20-HAP1-SDA', 'w-21-HAP1-SCL'], at: ENTRIES.map((e) => e.t + 2) },
  ],
  run(t, view) {
    const sector = sectorAt(t);
    setDial(view, 'heading', { angle: headingAt(t), sector });
    view.q<HTMLElement>('.c-hc-sector').textContent = sector;

    // The effect's name stays up for a second after it plays; the motor runs for its 100 ms.
    const entry = [...ENTRIES].reverse().find((e) => e.t <= t);
    const since = entry ? t - entry.t : Infinity;
    const label = view.q<HTMLElement>('.c-hc-effect');
    label.textContent = entry?.effect ?? '';
    label.style.opacity = String(since < 1000 ? 1 - clamp((since - 700) / 300) : 0);

    const buzzing = since < EFFECT_MS;
    view.part<Haptic>('HAP1').vibrating = buzzing;
    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-hc-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default cell;
