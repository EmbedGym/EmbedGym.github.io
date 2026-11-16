import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { lighter, setLighter } from '../../decor/lighter';
import { puffs, runPuffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, FAST, GAS, aoVolts, fanAngle, fanOn, fanSvg, fastForward, printsFor } from '../mega/gas_ventilation_fan_control';

type Relay = HTMLElement & { energized: boolean };
type Led = HTMLElement & { value: boolean };

// Zephyr: AO reaches P0.03 (AIN1) as 0.6 × AO through the 100k/150k divider; a
// 12-bit SAADC read at gain 1/6 (3.6 V full scale). The baseline is the
// clean-air (1 V) reading.
const raw = (volts: number) => Math.round(((0.6 * volts) / 3.6) * 4096);
const PRINTS = printsFor((t) => raw(aoVolts(t)) / raw(1));
const FONT = 40;
const PANEL = { x: -790, y: 0, w: 520, h: 34 + 4 * FONT * 1.36 + 10 };
const FAN = { x: -223, y: 15 };
const BADGE = { x: PANEL.x, y: PANEL.y + PANEL.h + 12 };
const BATTERY = { x: -233, y: 92 };
// Under the MQ2, its nozzle below the sensor's left half.
const LIGHTER = { x: -120, y: 392 };
const NOZZLE_X = LIGHTER.x + 132;
const PUFFS = 9;
const AO_WIRES = ['w2', 'w3', 'w4'];

const gasVentilationFanControlNrf52840: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      { id: 'FAN', ...FAN, html: fanSvg('c-gvn'), pins: { A: { x: 10, y: 60 }, B: { x: 60, y: 45 } } },
      batteryPart('BAT', BATTERY.x, BATTERY.y - 6, { leads: 'up' }),
    ],
    wires: [
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['FAN', 'B'], color: '#f59e0b' },
      { id: 'load-ret', from: ['FAN', 'A'], to: ['BAT', 'neg'], color: '#000000', via: [{ x: -213, y: 84 }, { x: -225, y: 84 }] },
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: -153, y: 70 }, { x: -153, y: 84 }, { x: -169, y: 84 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-gvn-blades { transform-origin: 29px 27px; }
        .c-gvn-ff {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; padding: 2px 14px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font: 700 40px var(--sans); color: var(--accent); white-space: nowrap;
        }
      </style>
      ${serialPanel('gas-ventn', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT })}
      <div class="c-gvn-ff">▶▶ ×${FAST}</div>
      ${puffs('gvn', PUFFS)}
      <div style="position:absolute;left:${NOZZLE_X}px;top:${LIGHTER.y}px">${lighter('gvn')}</div>`,
    bounds: [PANEL.x, PANEL.y, 0, LIGHTER.y + 38],
  },
  run(t, view) {
    const head = view.box('GAS1');
    runPuffs(view, 'gvn', t, { from: { x: NOZZLE_X, y: LIGHTER.y }, to: { x: head.x + 44.6, y: head.y + 38.5 }, window: GAS, size: [5, 20], spread: 24, seed: 3 });
    setLighter(view, 'gvn', t, t >= GAS[0] && t < GAS[1]);

    const on = fanOn(t);
    view.part<Relay>('RLY1').energized = on;
    view.part<Led>('L1').value = on;
    if (on) {
      for (const id of ['w6', 'w9', 'w10']) view.glowWire(id, 1);
      for (const id of ['load-no', 'load-ret', 'load-com']) view.glowWire(id, 0.6);
    }
    view.q<SVGGElement>('.c-gvn-blades').style.transform = `rotate(${fanAngle(t)}deg)`;
    for (const id of AO_WIRES) view.glowWire(id, clamp(aoVolts(t) - 1));
    showSerial(view, 'gas-ventn', t, PRINTS);
    view.q<HTMLElement>('.c-gvn-ff').style.opacity = fastForward(t) ? '1' : '0';
  },
};

export default gasVentilationFanControlNrf52840;
