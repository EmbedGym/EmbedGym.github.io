import { clamp, easeInOutCubic, easeOutCubic, lerp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { puffs, runPuffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

type Mq2 = HTMLElement & { detected: boolean };

// Gas from an unlit lighter reaches the MQ2. When AO passes the module's
// comparator threshold, DO goes LOW and the DAT LED lights; the sketch prints
// GAS DETECTED once at that moment, and every second prints the raw reading
// and whether gas is detected.
export const DURATION = 6000;
export const GAS_ON = 700;
export const GAS_OFF = 2100;
export const CLEAN = 1.0;
export const GASSY = 3.5;
const TRIP = 2.0;
export const READS = [400, 1400, 2400, 3400, 4400, 5400];

export function aoVolts(t: number) {
  const risen = lerp(CLEAN, GASSY, easeOutCubic(clamp((t - GAS_ON - 200) / 1000)));
  if (t < GAS_OFF + 400) return risen;
  return lerp(risen, CLEAN, easeInOutCubic(clamp((t - GAS_OFF - 400) / 2600)));
}

export const detected = (t: number) => aoVolts(t) > TRIP;
let tripAt = 0;
while (!detected(tripAt)) tripAt += 1;

/** The serial lines for reports at `reads`, `raw` turning the AO voltage into the printed reading, plus GAS DETECTED at the trip; the previous loop's lines are already on screen at t=0, matching the end state. */
export function printsFor(reads: number[], raw: (volts: number) => number): Print[] {
  const loop: Print[] = [
    ...reads.map((r) => ({ t: r + 2, text: `Raw: ${raw(aoVolts(r))} Gas: ${detected(r) ? 'DETECTED' : 'clear'}` })),
    { t: tripAt + 1, text: 'GAS DETECTED' },
  ].sort((a, b) => a.t - b.t);
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}
const PRINTS = printsFor(READS, (volts) => Math.floor((volts * 1024) / 5));
const PANEL = { x: -334, y: -10, w: 290, h: 180 };
const LIGHTER = { x: -372, y: 255 };
const NOZZLE_X = LIGHTER.x + 132;
const PUFFS = 9;

/** An unlit lighter whose nozzle tip is at `nozzle`, pointing right (or left with `mirror`), with its gas puffs. */
export function leakHtml(key: string, nozzle: { x: number; y: number }, mirror = false): string {
  return `
      ${puffs(key, PUFFS)}
      <div style="position:absolute;left:${nozzle.x}px;top:${nozzle.y}px">${lighter(key, { mirror })}</div>`;
}

/** Puffs leave the nozzle while the gas is on and spread over the sensor head at `head`. */
export function runLeak(view: CellView, key: string, t: number, nozzle: { x: number; y: number }, head: { x: number; y: number }) {
  runPuffs(view, key, t, { from: nozzle, to: head, window: [GAS_ON, GAS_OFF], seed: 11 });
  setLighter(view, key, t, t >= GAS_ON && t < GAS_OFF);
}

const mq2GasLeakDetector: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mq2-leak', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      ${leakHtml('mql', { x: NOZZLE_X, y: LIGHTER.y })}`,
    bounds: [NOZZLE_X - 110, PANEL.y, 90, LIGHTER.y + 38],
  },
  run(t, view) {
    const head = view.box('GAS1');
    runLeak(view, 'mql', t, { x: NOZZLE_X, y: LIGHTER.y }, { x: head.x + 44.6, y: LIGHTER.y });

    const gas = detected(t);
    view.part<Mq2>('GAS1').detected = gas;
    if (gas) view.glowWire('w-5-DO', 1);
    view.glowWire('w-A0-AO', clamp((aoVolts(t) - CLEAN) / (GASSY - CLEAN)));
    showSerial(view, 'mq2-leak', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default mq2GasLeakDetector;
