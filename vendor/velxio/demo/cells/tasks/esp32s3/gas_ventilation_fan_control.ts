import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { lighter, setLighter } from '../../decor/lighter';
import { puffs, runPuffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, FAST, GAS, aoVolts, fanAngle, fanOn, fanSvg, fastForward, printsFor } from '../mega/gas_ventilation_fan_control';

type Relay = HTMLElement & { energized: boolean };
type Led = HTMLElement & { value: boolean };

// ESP-IDF: AO reaches GPIO4 as 0.6 × AO through the 100k/150k divider; a 12-bit
// raw read at 11 dB. The baseline is the clean-air (1 V) reading.
const raw = (volts: number) => Math.round(((0.6 * volts) / 3.3) * 4095);
const PRINTS = printsFor((t) => raw(aoVolts(t)) / raw(1));
const FONT = 42;
// Right of the board; the cable runs under the board to the downward socket.
const PANEL = { x: 200, y: 110, w: 544, h: 34 + 4 * FONT * 1.36 + 10 };
const CABLE_BOTTOM = USB.esp32s3.y + 32;
const FAN = { x: 60, y: -190 };
const BADGE = { x: 200, y: 40 };
const BATTERY = { x: -30, y: -80 };
// Under the MQ2, its nozzle below the sensor's left half.
const LIGHTER = { x: -360, y: 352 };
const NOZZLE_X = LIGHTER.x + 132;
const PUFFS = 9;
const AO_WIRES = ['w2', 'w3', 'w4'];

const gasVentilationFanControlEsp32s3: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      { id: 'FAN', ...FAN, html: fanSvg('c-gve'), pins: { A: { x: 10, y: 60 }, B: { x: 60, y: 45 } } },
      batteryPart('BAT', BATTERY.x, BATTERY.y - 6, { leads: 'up' }),
    ],
    wires: [
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['FAN', 'B'], color: '#f59e0b', via: [{ x: 90, y: -118 }, { x: 130, y: -118 }, { x: 130, y: -145 }] },
      { id: 'load-ret', from: ['FAN', 'A'], to: ['BAT', 'neg'], color: '#000000', via: [{ x: 70, y: -124 }, { x: -20, y: -124 }] },
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: 80, y: -116 }, { x: 32, y: -116 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-gve-blades { transform-origin: 29px 27px; }
        .c-gve-ff {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; padding: 2px 14px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font: 700 42px var(--sans); color: var(--accent); white-space: nowrap;
        }
      </style>
      ${serialPanel('gas-vente', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      <div class="c-gve-ff">▶▶ ×${FAST}</div>
      ${puffs('gve', PUFFS)}
      <div style="position:absolute;left:${NOZZLE_X}px;top:${LIGHTER.y}px">${lighter('gve')}</div>`,
    bounds: [LIGHTER.x, FAN.y, PANEL.x + PANEL.w, Math.max(CABLE_BOTTOM + 4, PANEL.y + PANEL.h, LIGHTER.y + 38)],
  },
  run(t, view) {
    const head = view.box('GAS1');
    runPuffs(view, 'gve', t, { from: { x: NOZZLE_X, y: LIGHTER.y }, to: { x: head.x + 44.6, y: head.y + 38.5 }, window: GAS, size: [5, 20], spread: 24, seed: 3 });
    setLighter(view, 'gve', t, t >= GAS[0] && t < GAS[1]);

    const on = fanOn(t);
    view.part<Relay>('RLY1').energized = on;
    view.part<Led>('L1').value = on;
    if (on) {
      for (const id of ['w6', 'w9', 'w10']) view.glowWire(id, 1);
      for (const id of ['load-no', 'load-ret', 'load-com']) view.glowWire(id, 0.6);
    }
    view.q<SVGGElement>('.c-gve-blades').style.transform = `rotate(${fanAngle(t)}deg)`;
    for (const id of AO_WIRES) view.glowWire(id, clamp(aoVolts(t) - 1));
    showSerial(view, 'gas-vente', t, PRINTS);
    view.q<HTMLElement>('.c-gve-ff').style.opacity = fastForward(t) ? '1' : '0';
  },
};

export default gasVentilationFanControlEsp32s3;
