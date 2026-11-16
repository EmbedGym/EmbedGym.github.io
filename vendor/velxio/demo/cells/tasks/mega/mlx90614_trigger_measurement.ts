import type { Cell, CellView, Rect } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { mug, runMug } from '../../decor/mug';

type Button = HTMLElement & { pressed: boolean };

// The thermometer is aimed at a mug of hot tea. While the trigger is held the
// sketch samples the object temperature every 100 ms (after a 50 ms debounce)
// and keeps the highest; on release it prints it. A tap under 200 ms prints nothing.
export const DURATION = 5000;
export const HOLD: [number, number] = [500, 1800];
export const TAP: [number, number] = [2800, 2950];
const DEBOUNCE = 50;
const SAMPLES = [44.21, 44.67, 45.03, 44.88, 44.52, 44.95, 44.71, 44.4, 44.83, 44.61, 44.9, 44.77, 44.69];

/**
 * Sample times and serial lines for a sketch whose button is confirmed `debounce` ms
 * after each edge. It samples on the confirmed press, then every 100 ms counted from
 * that confirmation, or with `grid: 'edge'` on a 100 ms grid from the press edge.
 */
export function schedule(debounce: number, grid: 'confirm' | 'edge' = 'confirm'): { sampleAt: number[]; tapAt: number[]; prints: Print[] } {
  const during = ([down, up]: [number, number]) =>
    SAMPLES.map((_, i) => (i === 0 || grid === 'confirm' ? down + debounce + 100 * i : down + 100 * i)).filter((s) => s < up + debounce);
  const sampleAt = during(HOLD);
  const max = Math.max(...SAMPLES.slice(0, sampleAt.length));
  const loop: Print[] = [{ t: HOLD[1] + debounce + 2, text: `Measured: ${max.toFixed(1)} C` }];
  // The previous loop's line is already on screen at t=0, matching the end state.
  return { sampleAt, tapAt: during(TAP), prints: [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop] };
}
const { sampleAt: SAMPLE_AT, prints: PRINTS } = schedule(DEBOUNCE);

const PANEL = { x: -284, y: USB.mega.y - 39, w: 268, h: 78 };
const READOUT = { x: 182, y: -124, w: 136, h: 74 };
const MUG = { x: 410, y: -72 };

/** The running-maximum readout at `r`, with the fingertip that presses the trigger. */
export function readout(r: Rect): string {
  return `
      <style>
        .c-mt-panel {
          position: absolute;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-mt-head { position: absolute; left: 14px; top: 6px; font-size: 24px; font-weight: 700; color: var(--muted); }
        .c-mt-val { position: absolute; left: 14px; top: 34px; font: 700 26px var(--mono); color: var(--ink); }
        .c-mt-val.held { color: #d9663a; }
        .c-mt-head.short { color: var(--warn); }
      </style>
      <div class="c-mt-panel" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"><div class="c-mt-head">max</div><div class="c-mt-val"></div></div>`;
}

/** Presses button BTN through the hold and the tap, glowing `wires` while it is down. */
export function runTrigger(view: CellView, t: number, wires: string[]) {
  const btn = view.box('BTN');
  // The finger comes in from the left, so the button's top stays clear.
  const cap = { x: btn.x + btn.w / 2 - 4, y: btn.y + btn.h / 2 };
  const pressing = pressFinger(view, 'f', t, cap, [HOLD, TAP]);
  view.part<Button>('BTN').pressed = pressing;
  if (pressing) for (const w of wires) view.glowWire(w, 1);
}

/**
 * The readout follows the sketch's running maximum, from the first sample of
 * a hold until the next press resets it. With `tapAt` (the tap's sample times) it
 * also shows the tap's samples, which the sketch takes but never prints.
 */
export function runReadout(view: CellView, t: number, debounce: number, sampleAt: number[], tapAt: number[] = []) {
  const tapStarted = t >= TAP[0] + debounce;
  // The previous loop's tap is still on show until the hold is confirmed.
  const tapCarried = tapAt.length > 0 && t < HOLD[0] + debounce;
  const taken = tapCarried ? tapAt.length : (tapStarted ? tapAt : sampleAt).filter((s) => s <= t).length;
  const val = view.q<HTMLElement>('.c-mt-val');
  const shown = tapStarted || tapCarried ? tapAt.length > 0 : true;
  val.textContent = taken && shown ? `${Math.max(...SAMPLES.slice(0, taken)).toFixed(1)}°C` : '--';
  val.classList.toggle('held', taken > 0 && !tapCarried && (tapStarted ? t < TAP[1] + debounce : t < HOLD[1] + debounce));
  const short = t >= TAP[1] + debounce && t < TAP[1] + 1300;
  const head = view.q<HTMLElement>('.c-mt-head');
  head.textContent = short ? 'too short' : 'max';
  head.classList.toggle('short', short);
}

const mlx90614TriggerMeasurement: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-trigger', PANEL, { note: '115200', cableTo: USB.mega })}
      <div style="position:absolute;left:${MUG.x}px;top:${MUG.y}px">${mug('mt')}</div>
      ${readout(READOUT)}
      ${finger('f', { rotate: 270 })}`,
    bounds: [PANEL.x, READOUT.y, MUG.x + 46, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: SAMPLE_AT }],
  run(t, view) {
    runTrigger(view, t, ['w-10-BTN', 'w-10-RPD']);
    runReadout(view, t, DEBOUNCE, SAMPLE_AT);
    runMug(view, 'mt', t);
    showSerial(view, 'mlx-trigger', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default mlx90614TriggerMeasurement;
