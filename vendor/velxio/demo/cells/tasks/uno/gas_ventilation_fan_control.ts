import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { lighter, setLighter } from '../../decor/lighter';
import { puffs, runPuffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, FAST, GAS, aoVolts, fanAngle, fanOn, fanSvg, fastForward, printsFor, ratio } from '../mega/gas_ventilation_fan_control';

type Relay = HTMLElement & { energized: boolean };
type Led = HTMLElement & { value: boolean };

const PRINTS = printsFor(ratio);
const FONT = 29;
const PANEL = { x: -420, y: 24, w: 380, h: 34 + 4 * FONT * 1.36 + 10 };
const FAN = { x: -215, y: -85 };
const BADGE = { x: -420, y: 238 };
const BATTERY = { x: -225, y: -8 };
const LIGHTER = { x: -188, y: 256.5 };
const NOZZLE_X = LIGHTER.x + 132;
const PUFFS = 9;

const gasVentilationFanControlUno: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      { id: 'FAN', ...FAN, html: fanSvg('c-gvu'), pins: { A: { x: 10, y: 60 }, B: { x: 60, y: 45 } } },
      batteryPart('BAT', BATTERY.x, BATTERY.y - 6, { leads: 'up' }),
    ],
    wires: [
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['FAN', 'B'], color: '#f59e0b' },
      { id: 'load-ret', from: ['FAN', 'A'], to: ['BAT', 'neg'], color: '#000000', via: [{ x: -205, y: -16 }, { x: -217, y: -16 }] },
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: -145, y: -30 }, { x: -145, y: -16 }, { x: -161, y: -16 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-gvu-blades { transform-origin: 29px 27px; }
        .c-gvu-ff {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; padding: 2px 14px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font: 700 29px var(--sans); color: var(--accent);
        }
      </style>
      ${serialPanel('gas-ventu', PANEL, { note: '115200', cableTo: USB.uno, fontSize: FONT })}
      <div class="c-gvu-ff">▶▶ ×${FAST}</div>
      ${puffs('gvu', PUFFS)}
      <div style="position:absolute;left:${NOZZLE_X}px;top:${LIGHTER.y}px">${lighter('gvu')}</div>`,
    bounds: [PANEL.x, FAN.y, 0, LIGHTER.y + 38],
  },
  run(t, view) {
    const head = view.box('GAS1');
    const headX = head.x + 44.6;
    runPuffs(view, 'gvu', t, { from: { x: NOZZLE_X, y: LIGHTER.y }, to: { x: headX, y: LIGHTER.y }, window: GAS, seed: 3 });
    setLighter(view, 'gvu', t, t >= GAS[0] && t < GAS[1]);

    const on = fanOn(t);
    view.part<Relay>('RLY1').energized = on;
    view.part<Led>('L1').value = on;
    if (on) {
      for (const id of ['w-13-IN', 'w-12-resistor', 'w-resistor-LED']) view.glowWire(id, 1);
      for (const id of ['load-no', 'load-ret', 'load-com']) view.glowWire(id, 0.6);
    }
    view.q<SVGGElement>('.c-gvu-blades').style.transform = `rotate(${fanAngle(t)}deg)`;
    view.glowWire('w-A0-AO', clamp(aoVolts(t) - 1));
    showSerial(view, 'gas-ventu', t, PRINTS, { board: 'arduino-uno' });
    view.q<HTMLElement>('.c-gvu-ff').style.opacity = fastForward(t) ? '1' : '0';
  },
};

export default gasVentilationFanControlUno;
