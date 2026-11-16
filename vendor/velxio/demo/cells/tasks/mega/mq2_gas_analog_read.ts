import { clamp, easeInOutCubic, easeOutCubic, lerp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { puffs, runPuffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// Gas from an unlit lighter drifts over the MQ2. Its AO voltage climbs from
// 1.2 V to 3.7 V and falls back once the gas clears; the sketch reads A0 once a
// second and prints the raw value and the voltage.
export const DURATION = 5000;
export const GAS_ON = 900;
export const GAS_OFF = 2200;
export const CLEAN = 1.2;
export const GASSY = 3.7;
export const READS = [300, 1300, 2300, 3300, 4300];

export function aoVolts(t: number) {
  const risen = lerp(CLEAN, GASSY, easeOutCubic(clamp((t - GAS_ON - 200) / 1000)));
  if (t < GAS_OFF + 300) return risen;
  return lerp(risen, CLEAN, easeInOutCubic(clamp((t - GAS_OFF - 300) / 2300)));
}

const line = (volts: number) => {
  const raw = Math.floor((volts * 1024) / 5);
  return `Raw: ${raw} Voltage: ${((raw * 5) / 1024).toFixed(2)} V`;
};

/** The serial lines a sketch prints at `reads`, `line` turning the AO voltage into its text; the previous loop's lines are already on screen at t=0, matching the end state. */
export function printsFor(reads: number[], text: (volts: number) => string): Print[] {
  const loop: Print[] = reads.map((r) => ({ t: r + 3, text: text(aoVolts(r)) }));
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}
const PRINTS = printsFor(READS, line);
const PANEL = { x: -310, y: 0, w: 290, h: 180 };
// Below the board, left of the sensor; the puffs drift up-right to its head.
const LIGHTER = { x: 68, y: 305 };
const NOZZLE_X = LIGHTER.x + 132;
const PUFFS = 9;

/** An unlit lighter whose nozzle tip is at `nozzle`, pointing right (or left with `mirror`), with its gas puffs. */
export function gasHtml(key: string, nozzle: { x: number; y: number }, mirror = false): string {
  return `
      ${puffs(key, PUFFS)}
      <div style="position:absolute;left:${nozzle.x}px;top:${nozzle.y}px">${lighter(key, { mirror })}</div>`;
}

/** Puffs leave the nozzle while the gas is on and spread over the sensor head at `head`. */
export function runGas(view: CellView, key: string, t: number, nozzle: { x: number; y: number }, head: { x: number; y: number }) {
  runPuffs(view, key, t, { from: nozzle, to: head, window: [GAS_ON, GAS_OFF], seed: 7 });
  setLighter(view, key, t, t >= GAS_ON && t < GAS_OFF);
}

const mq2GasAnalogRead: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mq2-analog', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      ${gasHtml('mqa', { x: NOZZLE_X, y: LIGHTER.y })}`,
    bounds: [PANEL.x, PANEL.y, 90, LIGHTER.y + 38],
  },
  run(t, view) {
    const head = view.box('GAS1');
    runGas(view, 'mqa', t, { x: NOZZLE_X, y: LIGHTER.y }, { x: head.x + head.w - 44.6, y: head.y + head.h / 2 });
    view.glowWire('w-A0-AO', clamp((aoVolts(t) - CLEAN) / (GASSY - CLEAN)));
    showSerial(view, 'mq2-analog', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default mq2GasAnalogRead;
