import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { BLUE } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { setTurn, turn } from '../../decor/turn';
import { BACK, DURATION, FADE_FROM, FROM, LOG_A, LOG_B, PRINTS, TO, headingAt } from '../mega/compass_heading_logger';

// Same logic and prints as the Mega: app_main logs every 5 s (vTaskDelayUntil)
// and adds "Total turned" on the first log after the RTC crosses :00 or :30.
const BOARD = 'esp32-s3';
const RTC_WIRES = ['w-38-LV1', 'w-39-LV2', 'w-HV1-SDA', 'w-HV2-SCL'];
const MAG_WIRES = ['w-38-MAG1-SDA', 'w-39-MAG1-SCL'];

// The console socket is at the board's bottom end, so the monitor sits under it
// and the card is as tall as the board plus the parts above it: two unwrapped
// rows, set large.
const FONT = 44;
const SERIAL = { x: -560, y: 366, w: 1100, h: 34 + 2 * FONT * 1.36 + 10 };
// Right of MAG1, under RTC1.
const ZOOM = 1.8;
const PANEL = { x: 296, y: 34, w: 200, h: 164 };
const DIAL = { cx: 62, cy: 100 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      <div style="position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px;transform:scale(${ZOOM});transform-origin:0 0;background:#f8fafc;border:1.5px solid #cfd6df;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,0.08)">
        <div style="position:absolute;left:12px;top:6px;font:600 26px var(--sans);color:var(--muted);white-space:nowrap">MAG1 heading</div>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('heading', { pointer: 'needle' })}</div>
        <div class="c-cle-sum" style="position:absolute;left:116px;top:84px;font:700 28px var(--mono);color:${BLUE}">+45°</div>
      </div>
      ${turn('mag')}`,
    bounds: [SERIAL.x, -86, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
  },
  // Each log reads the RTC's seven time registers through LS1, then the compass's six data bytes.
  activity: [
    { wires: RTC_WIRES, at: [LOG_A - 4, LOG_B - 4] },
    { wires: MAG_WIRES, at: [LOG_A - 1, LOG_B - 1] },
  ],
  run(t, view) {
    // The turned arc and its sum show from the :00 log and fade as the board turns back.
    const summed = t >= LOG_B + 4 ? 1 - clamp((t - BACK.at) / 300) : 0;
    setDial(view, 'heading', { angle: headingAt(t), turned: { from: FROM, to: TO, opacity: summed } });
    view.q<HTMLElement>('.c-cle-sum').style.opacity = String(summed);
    // The arrow over MAG1 shows the board turning, clockwise out and anticlockwise back.
    const step = headingAt(t + 40) - headingAt(t - 40);
    const mag = view.box('MAG1');
    setTurn(view, 'mag', { x: mag.x + mag.w * 0.85, y: mag.y + mag.h * 0.62 }, step < 0 ? -1 : 1, clamp(Math.abs(step) / 2), 1.6);
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
  },
};

export default cell;
