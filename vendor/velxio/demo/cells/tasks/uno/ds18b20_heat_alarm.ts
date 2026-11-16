import type { Cell } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { CONVERSIONS, DURATION, FLAME_OFF, FLAME_ON, PANEL as PROBE, probePanel, runAlarm, runProbePanel } from '../mega/ds18b20_heat_alarm';

const WIRES = { data: ['w-4-data', 'w-4-RPU'], led: ['w-3-R1', 'w-R1-L1'], buzzer: ['w-2-BZ1'] };

// Left of the board, which no wire uses; the probe sits far right with the lighter beyond it.
// The Mega panel's 24 px text, scaled so it stays at least 18 px on this smaller card.
const PANEL_SCALE = 1.2;
const PANEL = { x: -266, y: 20 };
const NOZZLE = { x: 560, y: -120 };

const ds18b20HeatAlarmUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <div style="position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;transform:scale(${PANEL_SCALE});transform-origin:0 0">${probePanel({ x: 0, y: 0 })}</div>
      <div style="position:absolute;left:${NOZZLE.x}px;top:${NOZZLE.y}px">${lighter('dsu', { kind: 'flame', mirror: true, scale: 0.55, flameScale: 1.4 })}</div>`,
    bounds: [PANEL.x, PANEL.y, NOZZLE.x + 66, PANEL.y + PROBE.h * PANEL_SCALE],
  },
  activity: [{ wires: WIRES.data, at: CONVERSIONS }],
  run(t, view) {
    setLighter(view, 'dsu', t, t >= FLAME_ON && t < FLAME_OFF);
    runProbePanel(view, t);
    runAlarm(view, t, WIRES);
  },
};

export default ds18b20HeatAlarmUno;
