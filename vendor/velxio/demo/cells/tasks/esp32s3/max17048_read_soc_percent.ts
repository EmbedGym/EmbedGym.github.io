import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { statusOf } from '../mega/max17048_read_soc_percent';
import { RATE_STYLE, SOC_STATES, rateChip, setRateChip } from '../uno/max17048_read_soc_percent';
import { ESP_GAUGE, ESP_LIPO } from './max17048_read_cell_voltage';

const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

const DURATION = 5000;
// The nRF card shares these reads. app_main waits a full second before each read, so reads fall on whole seconds; the loop's t=0 read is the
// previous loop's 5000 ms one.
export const READS = [0, 1000, 2000, 3000, 4000];
/** The battery changes 400 ms before the read that reports it. */
const LEAD = 400;
export const stateAt = (t: number) => SOC_STATES[Math.floor(((t + LEAD) % DURATION) / 1000)];
const LOOP_PRINTS: Print[] = READS.map((t, i) => ({
  t: t + 25,
  text: `SOC: ${SOC_STATES[i][0].toFixed(1)} Status: ${statusOf(SOC_STATES[i][1])}`,
}));
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

// The frame scales to about 0.48: text is sized to stay 18 px or more on screen.
const LIPO_SCALE = 1.6;
const POUCH_RIGHT = ESP_LIPO.x + LIPO.leadX * LIPO_SCALE;
const POUCH_MID = ESP_LIPO.y + LIPO.h * LIPO_SCALE - (LIPO.pouchH * LIPO_SCALE) / 2;
const CHIP = { right: POUCH_RIGHT + 360, size: 58 };
// Under the UART socket, below the board and the LiPo.
const PANEL = { x: -20, y: 366, w: 700, h: 152 };

const max17048ReadSocPercentEsp: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: READS }],
  decor: {
    html: `
      ${RATE_STYLE}
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 38 })}
      ${lipo('cell', { ...ESP_LIPO, lead: 'up', scale: LIPO_SCALE })}
      ${rateChip(CHIP.right, POUCH_MID - CHIP.size / 2, CHIP.size)}`,
    bounds: [PANEL.x, ESP_GAUGE.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const [soc, crate] = stateAt(t);
    setLipo(view, 'cell', soc / 100, `${soc.toFixed(1)}%`);
    setRateChip(view, crate);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default max17048ReadSocPercentEsp;
