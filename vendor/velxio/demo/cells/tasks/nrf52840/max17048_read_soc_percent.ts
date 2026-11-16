import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { statusOf } from '../mega/max17048_read_soc_percent';
import { READS, stateAt } from '../esp32s3/max17048_read_soc_percent';
import { RATE_STYLE, SOC_STATES, rateChip, setRateChip } from '../uno/max17048_read_soc_percent';
import { NRF_GAUGE, NRF_LIPO, NRF_LIPO_SCALE } from './max17048_read_cell_voltage';

const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];

// main reads on whole seconds, as on the ESP32-S3. A line too long for the panel wraps before "Status:"; at most
// three rows show at once.
const DURATION = 5000;
const LOOP_PRINTS: Print[] = READS.map((t, i) => ({
  t: t + 25,
  text: `SOC:&nbsp;${SOC_STATES[i][0].toFixed(1)} Status:&nbsp;${statusOf(SOC_STATES[i][1])}`,
}));
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

const POUCH_RIGHT = NRF_LIPO.x - (LIPO.h - LIPO.pouchH) * NRF_LIPO_SCALE;
const POUCH_TOP = NRF_LIPO.y - (LIPO.pouchH / 2) * NRF_LIPO_SCALE;
// Above the pouch, right-aligned with it.
const RATE = { right: POUCH_RIGHT, top: POUCH_TOP - 46, h: 38 };
const PANEL = { x: -412, y: 30, w: 385, h: 176 };

const max17048ReadSocPercentNrf: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: READS }],
  decor: {
    html: `
      ${RATE_STYLE}
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: 26 })}
      ${lipo('cell', { ...NRF_LIPO, lead: 'right', scale: NRF_LIPO_SCALE })}
      ${rateChip(RATE.right, RATE.top, RATE.h)}`,
    bounds: [PANEL.x, Math.min(RATE.top, NRF_GAUGE.y), NRF_GAUGE.x + NRF_GAUGE.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const [soc, crate] = stateAt(t);
    setLipo(view, 'cell', soc / 100, `${soc.toFixed(1)}%`);
    setRateChip(view, crate);
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default max17048ReadSocPercentNrf;
