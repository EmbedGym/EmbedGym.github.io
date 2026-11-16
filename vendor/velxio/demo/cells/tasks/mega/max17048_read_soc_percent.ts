import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { GAUGE_READS, READ_LIPO } from './max17048_read_cell_voltage';

// The sketch reads the charge and the charge rate (CRATE) once a second and
// names the status from the rate alone: above +0.5 %/h charging, below
// -0.5 %/h discharging, otherwise idle. The rates are the test's: 0, +12.5,
// +0.2, -9.4 and -0.2 %/h, so a slow +0.2 or -0.2 still reads idle.
export const DURATION = 6000;
export const READINGS: [soc: number, crate: number][] = [
  [72.5, 0],
  [78.1, 12.5],
  [85.3, 12.5],
  [85.3, 0.2],
  [79.0, -9.4],
  [72.6, -0.2],
];
export const statusOf = (crate: number) => (crate > 0.5 ? 'charging' : crate < -0.5 ? 'discharging' : 'idle');

const LOOP_PRINTS: Print[] = GAUGE_READS.map((t, i) => ({
  t: t + 25,
  // Each line wraps once, before "Status:".
  text: `SOC:&nbsp;${READINGS[i][0].toFixed(1)} Status:&nbsp;${statusOf(READINGS[i][1])}`,
}));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -360, y: -105, w: 340, h: 185 };
const POUCH = { x: READ_LIPO.x - LIPO.leadX, y: READ_LIPO.y - LIPO.h };

const max17048ReadSocPercent: Cell = {
  duration: DURATION,
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: GAUGE_READS }],
  decor: {
    html: `
      <style>
        .c-soc-rate {
          position: absolute; padding: 2px 12px; border-radius: 16px;
          font: 700 24px/32px var(--mono); white-space: nowrap; border: 1.5px solid #cfd6df; background: #f8fafc; color: var(--muted);
        }
        .c-soc-rate.charging { color: #00870a; border-color: #00aa00; }
        .c-soc-rate.discharging { color: #b45309; border-color: #d97706; }
      </style>
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega, wrap: true })}
      ${lipo('cell', READ_LIPO)}
      <div class="c-soc-rate" style="right:${-POUCH.x + 22}px;top:${POUCH.y + 8}px"></div>`,
    bounds: [PANEL.x, POUCH.y, POUCH.x + LIPO.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    // Before the first read the gauge still shows the previous loop's last one.
    const read = GAUGE_READS.findLastIndex((r) => r <= t);
    const [soc, crate] = READINGS[read === -1 ? READINGS.length - 1 : read];
    setLipo(view, 'cell', soc / 100, `${soc.toFixed(1)}%`);
    const rate = view.q<HTMLElement>('.c-soc-rate');
    rate.textContent = `CRATE ${crate > 0 ? '+' : ''}${crate.toFixed(1)}%/h`;
    rate.className = `c-soc-rate ${statusOf(crate)}`;
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default max17048ReadSocPercent;
