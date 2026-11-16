import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { BLUE } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { setTurn, turn } from '../../decor/turn';
import { BACK, DURATION, FADE_FROM, FROM, LOG_A, LOG_B, PRINTS, TO, headingAt } from '../mega/compass_heading_logger';

// Same logic and prints as the Mega: main() logs every 5 s (k_sleep to an absolute time) and adds
// "Total turned" on the first log after the RTC crosses :00 or :30.
const BOARD = 'nrf52840-dk';
const RTC_WIRES = ['w-P0.21-LV1', 'w-P0.27-LV2', 'w-HV1-SDA', 'w-HV2-SCL'];
const MAG_WIRES = ['w-P0.21-MAG1-SDA', 'w-P0.27-MAG1-SCL'];

// The console socket is on the board's left edge, behind the parts, so the
// monitor sits left of them, under RTC1's level, set large for the wide card;
// the heading panel is above it, left of RTC1.
const FONT = 45;
const SERIAL = { x: -851, y: -10, w: 676, h: 34 + 5 * FONT * 1.36 + 10 };
const PANEL = { x: -851, y: -230, w: 506, h: 184 };
const DIAL = { cx: 98, cy: 92, scale: 2 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: FONT })}
      <div style="position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px;background:#f8fafc;border:1.5px solid #cfd6df;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,0.08)">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('heading', { pointer: 'needle', scale: DIAL.scale })}</div>
        <div style="position:absolute;left:210px;top:14px;font:600 44px var(--sans);color:var(--muted);white-space:nowrap">Heading</div>
        <div class="c-cln-sum" style="position:absolute;left:210px;top:84px;font:700 56px var(--mono);color:${BLUE}">+45°</div>
      </div>
      ${turn('mag')}`,
    bounds: [SERIAL.x, PANEL.y, 516, SERIAL.y + SERIAL.h],
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
    view.q<HTMLElement>('.c-cln-sum').style.opacity = String(summed);
    // The arrow over MAG1 shows the board turning, clockwise out and anticlockwise back.
    const step = headingAt(t + 40) - headingAt(t - 40);
    const mag = view.box('MAG1');
    setTurn(view, 'mag', { x: mag.x + mag.w * 0.15, y: mag.y + mag.h * 0.5 }, step < 0 ? -1 : 1, clamp(Math.abs(step) / 2), 1.6);
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
  },
};

export default cell;
