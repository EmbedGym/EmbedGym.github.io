import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, GAUGE_JST, GAUGE_READS, PRINTS, voltsAt } from '../mega/max17048_read_cell_voltage';

const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-SDA', 'w-SCL'];

/** GAUGE1's element top-left. */
export const UNO_GAUGE = { x: 288, y: 124.8 };
export const UNO_LIPO = { x: UNO_GAUGE.x + GAUGE_JST.x, y: UNO_GAUGE.y + GAUGE_JST.y };
const PANEL = { x: -250, y: 22, w: 230, h: 103 };

const max17048ReadCellVoltageUno: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: GAUGE_READS }],
  decor: {
    html: `${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, fontSize: 22 })}${lipo('cell', UNO_LIPO)}`,
    bounds: [PANEL.x, UNO_LIPO.y - LIPO.h, UNO_LIPO.x - LIPO.leadX + LIPO.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    setLipo(view, 'cell', null, `${voltsAt(t).toFixed(2)} V`);
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default max17048ReadCellVoltageUno;
