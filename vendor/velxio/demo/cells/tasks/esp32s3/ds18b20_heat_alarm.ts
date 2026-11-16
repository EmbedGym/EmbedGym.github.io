import type { Cell } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { CONVERSIONS, DURATION, FLAME_OFF, FLAME_ON, PANEL as PROBE, probePanel, runAlarm, runProbePanel } from '../mega/ds18b20_heat_alarm';

const WIRES = { data: ['w-14-data', 'w-14-RPU'], led: ['w-10-R1', 'w-R1-L1'], buzzer: ['w-11-BZ1'] };

// The Mega panel's 24 px text, scaled so it stays at least 18 px on this smaller card.
const PANEL_SCALE = 1;
// Left of the red trunk, above the probe; the lighter reaches the probe from the left.
const PANEL = { x: -480, y: 110 };
const NOZZLE = { x: -372, y: 280 };

const ds18b20HeatAlarmEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <div style="position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;transform:scale(${PANEL_SCALE});transform-origin:0 0">${probePanel({ x: 0, y: 0 })}</div>
      <div style="position:absolute;left:${NOZZLE.x}px;top:${NOZZLE.y}px">${lighter('dse', { kind: 'flame', scale: 0.55, flameScale: 1.4 })}</div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PROBE.w * PANEL_SCALE, NOZZLE.y + 20],
  },
  activity: [{ wires: WIRES.data, at: CONVERSIONS }],
  run(t, view) {
    setLighter(view, 'dse', t, t >= FLAME_ON && t < FLAME_OFF);
    runProbePanel(view, t);
    runAlarm(view, t, WIRES);
  },
};

export default ds18b20HeatAlarmEsp32s3;
