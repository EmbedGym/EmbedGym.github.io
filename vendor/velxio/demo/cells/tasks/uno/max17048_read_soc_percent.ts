import type { Cell, CellView } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { statusOf } from '../mega/max17048_read_soc_percent';
import { UNO_GAUGE, UNO_LIPO } from './max17048_read_cell_voltage';

const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-SDA', 'w-SCL'];

/** The test's five charge/rate pairs, one read each: idle, charging, a slow +0.2 that still reads idle, discharging, a slow −0.2. */
export const SOC_STATES: [soc: number, crate: number][] = [
  [72.5, 0],
  [85.3, 12.5],
  [30.4, 0.2],
  [47.8, -9.4],
  [18.4, -0.2],
];
const DURATION = 5000;
// The sketch reads 300 ms after reset, then once a second.
const READS = [300, 1300, 2300, 3300, 4300];
/** The battery changes 400 ms before the read that reports it. */
const LEAD = 400;
const stateAt = (t: number) => SOC_STATES[Math.floor(((t + LEAD - READS[0]) % DURATION) / 1000)];
// Each line wraps once, before "Status:".
const LOOP_PRINTS: Print[] = READS.map((t, i) => ({
  t: t + 25,
  text: `SOC:&nbsp;${SOC_STATES[i][0].toFixed(1)} Status:&nbsp;${statusOf(SOC_STATES[i][1])}`,
}));
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

const PANEL = { x: -365, y: 0, w: 345, h: 184 };
// The frame scales to about 0.73, so the pouch grows to keep its label 18 px or more.
const LIPO_SCALE = 1.05;
const POUCH = { x: UNO_LIPO.x - LIPO.leadX * LIPO_SCALE, y: UNO_LIPO.y - LIPO.h * LIPO_SCALE };
// Under the gauge, below the wires that run beneath it.
const RATE = { right: UNO_GAUGE.x + 96, top: 254, h: 38 };

/** The CRATE chip's look, shared by the Uno, ESP32-S3 and nRF52840 cards. */
export const RATE_STYLE = `
  <style>
    .c-socp-rate {
      position: absolute; padding: 0 12px; border-radius: 16px; box-sizing: border-box;
      font: 700 25px/35px var(--mono); white-space: nowrap; border: 1.5px solid #cfd6df; background: #f8fafc; color: var(--muted);
    }
    .c-socp-rate.charging { color: #00870a; border-color: #00aa00; }
    .c-socp-rate.discharging { color: #b45309; border-color: #d97706; }
  </style>`;

/** A CRATE chip `size` px high, its right edge at `right` and its top at `top`; text size 0.66 × `size`. */
export const rateChip = (right: number, top: number, size = 38) =>
  `<div class="c-socp-rate" style="right:${-right}px;top:${top}px;height:${size}px;font-size:${size * 0.66}px;line-height:${size - 3}px"></div>`;

export function setRateChip(view: CellView, crate: number) {
  const rate = view.q<HTMLElement>('.c-socp-rate');
  rate.textContent = `CRATE ${crate > 0 ? '+' : ''}${crate.toFixed(1)}%/h`;
  rate.className = `c-socp-rate ${statusOf(crate)}`;
}

const max17048ReadSocPercentUno: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: READS }],
  decor: {
    html: `
      ${RATE_STYLE}
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, wrap: true })}
      ${lipo('cell', { ...UNO_LIPO, scale: LIPO_SCALE })}
      ${rateChip(RATE.right, RATE.top)}`,
    bounds: [PANEL.x, PANEL.y, POUCH.x + LIPO.w * LIPO_SCALE, RATE.top + RATE.h],
  },
  run(t, view) {
    const [soc, crate] = stateAt(t);
    setLipo(view, 'cell', soc / 100, `${soc.toFixed(1)}%`);
    setRateChip(view, crate);
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default max17048ReadSocPercentUno;
