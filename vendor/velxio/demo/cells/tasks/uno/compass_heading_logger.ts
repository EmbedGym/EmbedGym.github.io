import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { BLUE } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { BACK, DURATION, FADE_FROM, FROM, LOG_A, LOG_B, PRINTS, TO, headingAt } from '../mega/compass_heading_logger';

// Same sketch logic and prints as the Mega: a log every 5 s, "Total turned" on the first log past :00.
const BOARD = 'arduino-uno';
const RTC_WIRES = ['w-A4-RTC1-SDA', 'w-A5-RTC1-SCL'];
const MAG_WIRES = ['w-A4-MAG1-SDA', 'w-A5-MAG1-SCL'];

const SERIAL = { x: -440, y: 50, w: 420, h: 146 };
// Left of MAG1, under the monitor.
const PANEL = { x: -126, y: 208, w: 200, h: 164 };
const DIAL = { cx: 62, cy: 100 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.uno, wrap: true })}
      <div style="position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px;background:#f8fafc;border:1.5px solid #cfd6df;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,0.08)">
        <div style="position:absolute;left:12px;top:6px;font:600 24px var(--sans);color:var(--muted);white-space:nowrap">MAG1 heading</div>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('heading', { pointer: 'needle' })}</div>
        <div class="c-clu-sum" style="position:absolute;left:116px;top:84px;font:700 28px var(--mono);color:${BLUE}">+45°</div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  // Each log reads the RTC's seven time registers, then the compass's six data bytes.
  activity: [
    { wires: RTC_WIRES, at: [LOG_A - 4, LOG_B - 4] },
    { wires: MAG_WIRES, at: [LOG_A - 1, LOG_B - 1] },
  ],
  run(t, view) {
    // The turned arc and its sum show from the :00 log and fade as the board turns back.
    const summed = t >= LOG_B + 4 ? 1 - clamp((t - BACK.at) / 300) : 0;
    setDial(view, 'heading', { angle: headingAt(t), turned: { from: FROM, to: TO, opacity: summed } });
    view.q<HTMLElement>('.c-clu-sum').style.opacity = String(summed);
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
  },
};

export default cell;
