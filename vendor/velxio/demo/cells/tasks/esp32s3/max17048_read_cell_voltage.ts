import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { DURATION, GAUGE_JST } from '../mega/max17048_read_cell_voltage';

const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

/** app_main reads VCELL at once and then every 1000 ms (vTaskDelayUntil), with no setup delay. */
export const ESP_READS = [0, 1000, 2000, 3000, 4000, 5000];

// The nRF card shares these reads. The test's 3.70, 4.15 and 3.35 V, two reads each; the cell changes 500 ms before the next read.
export const voltsAt = (t: number) => (t >= 1500 && t < 3500 ? 4.15 : t >= 3500 && t < 5500 ? 3.35 : 3.7);
const LOOP_PRINTS: Print[] = ESP_READS.map((t) => ({ t: t + 20, text: `Voltage: ${voltsAt(t).toFixed(2)} V` }));
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

/** GAUGE1's element box: turned 180°, so its JST connectors open downward and the LiPo hangs below it. */
export const ESP_GAUGE = { x: 184, y: 165.4, w: 96, h: 76.8 };
export const ESP_LIPO = { x: ESP_GAUGE.x + ESP_GAUGE.w - GAUGE_JST.x, y: ESP_GAUGE.y + ESP_GAUGE.h - GAUGE_JST.y };
export const ESP_LIPO_SCALE = 1.55;
const PANEL = { x: -356, y: 352, w: 376, h: 154 };

const max17048ReadCellVoltageEsp: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: ESP_READS }],
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 37 })}${lipo('cell', { ...ESP_LIPO, lead: 'up', scale: ESP_LIPO_SCALE })}`,
    bounds: [PANEL.x, ESP_LIPO.y, ESP_LIPO.x + LIPO.leadX * ESP_LIPO_SCALE, PANEL.y + PANEL.h],
  },
  run(t, view) {
    setLipo(view, 'cell', null, `${voltsAt(t).toFixed(2)} V`);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default max17048ReadCellVoltageEsp;
