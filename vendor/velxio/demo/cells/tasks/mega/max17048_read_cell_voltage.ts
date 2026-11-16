import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

/** The gauge's left JST connector, where a LiPo lead ends, from the unturned element's top-left. */
export const GAUGE_JST = { x: 29, y: 16 };

/** The LiPo's lead tip on the gauge's JST connector, in the two read cells. */
export const READ_LIPO = { x: 304.2, y: -92 };

/** The sketch's reads: 300 ms after reset, then about once a second. */
export const GAUGE_READS = [300, 1300, 2300, 3300, 4300, 5300];

// The cell holds the test's 3.70, 4.15 and 3.35 V for two reads each. It
// changes 500 ms before the next read, so the monitor follows the battery.
export const DURATION = 6000;
const STEPS = [
  { from: 0, volts: 3.7 },
  { from: 1800, volts: 4.15 },
  { from: 3800, volts: 3.35 },
];
export const voltsAt = (t: number) => STEPS.findLast((s) => s.from <= t)!.volts;

const LOOP_PRINTS: Print[] = GAUGE_READS.map((t) => ({ t: t + 20, text: `Voltage: ${voltsAt(t).toFixed(2)} V` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -285, y: -58, w: 265, h: 118 };

const max17048ReadCellVoltage: Cell = {
  duration: DURATION,
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: GAUGE_READS }],
  decor: {
    html: `${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega })}${lipo('cell', READ_LIPO)}`,
    bounds: [PANEL.x, READ_LIPO.y - LIPO.h, READ_LIPO.x - LIPO.leadX + LIPO.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    setLipo(view, 'cell', null, `${voltsAt(t).toFixed(2)} V`);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default max17048ReadCellVoltage;
