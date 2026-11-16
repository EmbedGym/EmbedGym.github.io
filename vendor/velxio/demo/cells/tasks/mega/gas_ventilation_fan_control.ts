import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { lighter, setLighter } from '../../decor/lighter';
import { puffs, runPuffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

type Relay = HTMLElement & { energized: boolean };
type Led = HTMLElement & { value: boolean };

// Gas leaks from an unlit lighter onto the MQ2. Once a second the sketch reads
// A0 and prints its ratio to the clean-air baseline. Three readings in a row at
// 1.5 × or more switch the relay (the fan) and the LED on; the fan clears the
// gas, and once five readings in a row are at 1.2 × or less and the fan has run
// 10 s, it switches off. After switch-on the card runs four times faster, so
// the whole cycle fits one loop.
export const DURATION = 6000;
export const FAST = 4;
export const READS = [400, 1200, 2000, 2800, ...Array.from({ length: 10 }, (_, k) => 2800 + ((k + 1) * 1000) / FAST)];
export const GAS: [number, number] = [500, 1900];
const BASELINE = 204.6;

// AO voltage over the loop: gas arrives, then the running fan clears it.
const VOLTS: [number, number][] = [[0, 1], [700, 1], [1000, 2], [2900, 2], [3050, 1.6], [3300, 1.15], [3550, 1], [DURATION, 1]];
export function aoVolts(t: number) {
  const i = VOLTS.findIndex(([at]) => at > t);
  const [t0, v0] = VOLTS[i - 1];
  const [t1, v1] = VOLTS[i];
  return lerp(v0, v1, (t - t0) / (t1 - t0));
}
export const ratio = (t: number) => Math.floor((aoVolts(t) * 1024) / 5) / BASELINE;

// The sketch's own decision, reading by reading (each reading is 1 s of sketch time).
// The ratios sit far from the 1.5 / 1.2 thresholds, so every board's ADC decides alike.
const fanAfter: boolean[] = [];
{
  let on = false;
  let high = 0;
  let low = 0;
  let onAt = 0;
  READS.forEach((r, k) => {
    const x = ratio(r);
    high = x >= 1.5 ? high + 1 : 0;
    low = x <= 1.2 ? low + 1 : 0;
    if (!on && high >= 3) [on, onAt, high, low] = [true, k, 0, 0];
    if (on && low >= 5 && k - onAt >= 10) [on, high, low] = [false, 0, 0];
    fanAfter.push(on);
  });
}
const FAN_ON = READS[fanAfter.indexOf(true)];
const FAN_OFF = READS[fanAfter.lastIndexOf(true) + 1];
export const fanOn = (t: number) => t >= FAN_ON && t < FAN_OFF;

// `ratioAt(t)`: the board's reading at t over its clean-air baseline.
export function printsFor(ratioAt: (t: number) => number): Print[] {
  const loopPrints = READS.flatMap((r, k) => {
    const line = { t: r + 4, text: `Ratio: ${ratioAt(r).toFixed(2)} Fan: ${fanAfter[k] ? 'ON' : 'OFF'}` };
    if (r === FAN_ON) return [{ t: r + 2, text: 'Fan ON' }, line];
    if (r === FAN_OFF) return [{ t: r + 2, text: 'Fan OFF' }, line];
    return [line];
  });
  // The previous loop's lines are already on screen at t=0, matching the end state.
  return [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
}
const PRINTS = printsFor(ratio);
export const fastForward = (t: number) => t > FAN_ON + 50 && t < FAN_OFF + 100;

const PANEL = { x: -410, y: 16, w: 380, h: 204 };
const FAN = { x: -100, y: -97 };
const BADGE = { x: -410, y: 234 };
const BATTERY = { x: -110, y: -20 };
const LIGHTER = { x: -170, y: 255 };
const NOZZLE_X = LIGHTER.x + 132;
const PUFFS = 9;

// The relay's load, which circuit.ts leaves out: a 12 V fan and its battery.
// `cls` prefixes the blades' class, which spins about (29, 27).
export const fanSvg = (cls: string) => `
  <svg viewBox="0 0 60 60" width="60" height="60" style="overflow:visible">
    <path d="M 52 45 H 60 M 10 52 V 60" stroke="#8b95a1" stroke-width="2.6" />
    <rect x="2" y="0" width="54" height="54" rx="8" fill="#2f3640" />
    <circle cx="29" cy="27" r="23" fill="#d7dde4" />
    <g class="${cls}-blades" fill="#4b5563">
      <path d="M 29 27 C 26 16 31 7 39 9 C 41 17 36 24 29 27 Z" />
      <path d="M 29 27 C 26 16 31 7 39 9 C 41 17 36 24 29 27 Z" transform="rotate(120 29 27)" />
      <path d="M 29 27 C 26 16 31 7 39 9 C 41 17 36 24 29 27 Z" transform="rotate(240 29 27)" />
    </g>
    <circle cx="29" cy="27" r="5" fill="#2f3640" />
  </svg>`;

// Spin angle, the integral of a speed that ramps up at switch-on and down at
// switch-off. SPIN makes the loop end on a whole number of 120° blade turns.
const RAMP = 600;
const SPIN = (120 * 20) / (FAN_OFF - FAN_ON);
export function fanAngle(t: number) {
  if (t < FAN_ON) return 0;
  const up = Math.min(t - FAN_ON, RAMP);
  let angle = (SPIN * up * up) / (2 * RAMP) + SPIN * Math.max(0, Math.min(t, FAN_OFF) - FAN_ON - RAMP);
  if (t > FAN_OFF) {
    const d = Math.min(t - FAN_OFF, RAMP);
    angle += SPIN * (d - (d * d) / (2 * RAMP));
  }
  return angle;
}

const gasVentilationFanControl: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      { id: 'FAN', ...FAN, html: fanSvg('c-gv'), pins: { A: { x: 10, y: 60 }, B: { x: 60, y: 45 } } },
      batteryPart('BAT', BATTERY.x, BATTERY.y - 6, { leads: 'up' }),
    ],
    wires: [
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['FAN', 'B'], color: '#f59e0b' },
      { id: 'load-ret', from: ['FAN', 'A'], to: ['BAT', 'neg'], color: '#000000', via: [{ x: -90, y: -28 }, { x: -102, y: -28 }] },
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: -30, y: -42 }, { x: -30, y: -28 }, { x: -46, y: -28 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-gv-blades { transform-origin: 29px 27px; }
        .c-gv-ff {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; padding: 2px 14px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font: 700 29px var(--sans); color: var(--accent);
        }
      </style>
      ${serialPanel('gas-vent', PANEL, { note: '115200', cableTo: USB.mega, fontSize: 29 })}
      <div class="c-gv-ff">▶▶ ×${FAST}</div>
      ${puffs('gv', PUFFS)}
      <div style="position:absolute;left:${NOZZLE_X}px;top:${LIGHTER.y}px">${lighter('gv')}</div>`,
    bounds: [PANEL.x, PANEL.y, 90, LIGHTER.y + 38],
  },
  run(t, view) {
    const head = view.box('GAS1');
    const headX = head.x + 44.6;
    runPuffs(view, 'gv', t, { from: { x: NOZZLE_X, y: LIGHTER.y }, to: { x: headX, y: LIGHTER.y }, window: GAS, seed: 3 });
    setLighter(view, 'gv', t, t >= GAS[0] && t < GAS[1]);

    const on = fanOn(t);
    view.part<Relay>('RLY1').energized = on;
    view.part<Led>('L1').value = on;
    if (on) {
      for (const id of ['w-13-IN', 'w-12-resistor', 'w-resistor-LED']) view.glowWire(id, 1);
      for (const id of ['load-no', 'load-ret', 'load-com']) view.glowWire(id, 0.6);
    }
    view.q<SVGGElement>('.c-gv-blades').style.transform = `rotate(${fanAngle(t)}deg)`;
    view.glowWire('w-A0-AO', clamp(aoVolts(t) - 1));
    showSerial(view, 'gas-vent', t, PRINTS, { board: 'arduino-mega' });
    view.q<HTMLElement>('.c-gv-ff').style.opacity = fastForward(t) ? '1' : '0';
  },
};

export default gasVentilationFanControl;
