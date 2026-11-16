import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION } from '../mega/max17048_read_cell_voltage';
import { ESP_READS, PRINTS, voltsAt } from '../esp32s3/max17048_read_cell_voltage';

const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];

/** GAUGE1's element box: turned 270°, so its pins face the board and its JST connectors open left. */
export const NRF_GAUGE = { x: -96.8, y: -91.2, w: 76.8, h: 96 };
/** The left JST connector's tip, where the LiPo's lead ends. */
export const NRF_LIPO = { x: -80.8, y: -24.2 };
// The frame scales to about 0.66: the pouch grows to keep its label 18 px or more.
export const NRF_LIPO_SCALE = 1.2;
const POUCH_LEFT = NRF_LIPO.x - (LIPO.w + LIPO.h - LIPO.pouchH) * NRF_LIPO_SCALE;
const PANEL = { x: -320, y: 40, w: 293, h: 131 };

const max17048ReadCellVoltageNrf: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: ESP_READS }],
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: 28 })}
      ${lipo('cell', { ...NRF_LIPO, lead: 'right', scale: NRF_LIPO_SCALE })}`,
    bounds: [Math.min(PANEL.x, POUCH_LEFT), NRF_GAUGE.y, NRF_GAUGE.x + NRF_GAUGE.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    setLipo(view, 'cell', null, `${voltsAt(t).toFixed(2)} V`);
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default max17048ReadCellVoltageNrf;
