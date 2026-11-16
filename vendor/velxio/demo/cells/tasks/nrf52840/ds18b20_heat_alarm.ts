import type { Cell } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { FLAME_OFF, FLAME_ON, PANEL as PROBE, probePanel, runAlarm, runProbePanel } from '../mega/ds18b20_heat_alarm';

// The Zephyr loop waits out each ~750 ms conversion, reads the scratchpad and then sleeps
// 200 ms, so a reading completes about every 970 ms; the loop is five of those.
const PERIOD = 970;
const READS = [0, 1, 2, 3, 4].map((k) => k * PERIOD);

const WIRES = { data: ['w-P0.03-data'], led: ['w-P1.12-R1', 'w-R1-L1'], buzzer: ['w-P1.15-BZ1'] };

// The probe sits left of the board, the panel above it and the lighter beyond it.
// The Mega panel's 24 px text, scaled so it stays at least 18 px on this smaller card.
const PANEL_SCALE = 1.35;
const PANEL = { x: -350, y: -60 };
const NOZZLE = { x: -150, y: 154 };

const ds18b20HeatAlarmNrf52840: Cell = {
  duration: 5 * PERIOD,
  decor: {
    html: `
      <div style="position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;transform:scale(${PANEL_SCALE});transform-origin:0 0">${probePanel({ x: 0, y: 0 })}</div>
      <div style="position:absolute;left:${NOZZLE.x}px;top:${NOZZLE.y}px">${lighter('dsn', { kind: 'flame', scale: 0.55, flameScale: 1.4 })}</div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PROBE.w * PANEL_SCALE, NOZZLE.y + 20],
  },
  activity: [{ wires: WIRES.data, at: READS }],
  run(t, view) {
    setLighter(view, 'dsn', t, t >= FLAME_ON && t < FLAME_OFF);
    runProbePanel(view, t, READS);
    runAlarm(view, t, WIRES, READS);
  },
};

export default ds18b20HeatAlarmNrf52840;
