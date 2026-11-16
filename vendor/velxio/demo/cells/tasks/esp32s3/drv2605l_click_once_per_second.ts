import { sinceLast } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';
import { BUZZ_MS, CLICKS, DURATION, HEAD_X, PRINTS, PULSES, TRACK, clickLevel, stripPulse } from '../mega/drv2605l_click_once_per_second';

type Haptic = HTMLElement & { vibrating: boolean };

// main.c writes GO every 1000 ms, then printf("Click\n"); the model plays effect 1 for 100 ms.
const BOARD = 'esp32-s3';
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

// The board is tall, so the card's scale is low: the panels are drawn larger to stay legible.
const SERIAL_FONT = 36;
const SERIAL = { x: -214, y: 352, w: 224, h: 96 };
// The Mega's strip (236 × 96), enlarged.
const STRIP_ZOOM = 1.5;
const STRIP = { x: 160, y: 64, w: 236, h: 96 };
// The breakout is turned 90°, so the motor disc is on its right and the arcs go above and below it.
const MOTOR = { dx: 91.2, dy: 48 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dce-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans); transform-origin: 0 0;
        }
        .c-dce-title { position: absolute; left: 16px; top: 10px; font-size: 24px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-dce-base { stroke: #cfd6df; stroke-width: 3; }
        .c-dce-pulse { fill: #cfd6df; }
        .c-dce-pulse.on { fill: var(--accent); }
        .c-dce-head { stroke: var(--warn); stroke-width: 3; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: SERIAL_FONT })}
      <div class="c-dce-panel" style="left:${STRIP.x}px;top:${STRIP.y}px;width:${STRIP.w}px;height:${STRIP.h}px;transform:scale(${STRIP_ZOOM})">
        <div class="c-dce-title">effect 1, every 1 s</div>
        <svg width="${STRIP.w}" height="${STRIP.h}" style="position:absolute;left:0;top:0">
          <line class="c-dce-base" x1="${TRACK.x}" x2="${TRACK.x + TRACK.w}" y1="${TRACK.y}" y2="${TRACK.y}" />
          ${'<rect class="c-dce-pulse" width="10" height="26" rx="2" />'.repeat(PULSES)}
          <line class="c-dce-head" x1="${HEAD_X}" x2="${HEAD_X}" y1="${TRACK.y - 34}" y2="${TRACK.y + 8}" />
        </svg>
      </div>
      <div class="c-dce-motor" style="position:absolute;transform:rotate(90deg)">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, SERIAL.y, STRIP.x + STRIP.w * STRIP_ZOOM, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: I2C_WIRES, at: CLICKS }],
  run(t, view) {
    const since = sinceLast(t, CLICKS);
    view.part<Haptic>('HAP1').vibrating = since < BUZZ_MS;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-dce-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', clickLevel(since));

    view.qa<SVGRectElement>('.c-dce-pulse').forEach((p, i) => {
      const { x, opacity, played } = stripPulse(t, i);
      p.setAttribute('x', String(x - 5));
      p.setAttribute('y', String(TRACK.y - 26));
      p.style.opacity = String(opacity);
      p.classList.toggle('on', played);
    });

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;
