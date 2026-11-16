import { sinceLast } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';
import { BUZZ_MS, CLICKS, DURATION, HEAD_X, PRINTS, PULSES, TRACK, clickLevel, stripPulse } from '../mega/drv2605l_click_once_per_second';

type Haptic = HTMLElement & { vibrating: boolean };

// main.c writes GO every 1000 ms, then printk("Click\n"); the model plays effect 1 for 100 ms.
const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];

const SERIAL = { x: -330, y: 66, w: 246, h: 112 };
// The Mega's strip (236 × 96), a little larger for this card's scale, left of the breakout.
const STRIP_ZOOM = 1.05;
const STRIP = { x: -388, y: -86, w: 236, h: 96 };
// The breakout is turned 270°, so the motor disc is on its left and the arcs go above and below it.
const MOTOR = { dx: 20, dy: 48 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dcn-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans); transform-origin: 0 0;
        }
        .c-dcn-title { position: absolute; left: 16px; top: 10px; font-size: 24px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-dcn-base { stroke: #cfd6df; stroke-width: 3; }
        .c-dcn-pulse { fill: #cfd6df; }
        .c-dcn-pulse.on { fill: var(--accent); }
        .c-dcn-head { stroke: var(--warn); stroke-width: 3; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840 })}
      <div class="c-dcn-panel" style="left:${STRIP.x}px;top:${STRIP.y}px;width:${STRIP.w}px;height:${STRIP.h}px;transform:scale(${STRIP_ZOOM})">
        <div class="c-dcn-title">effect 1, every 1 s</div>
        <svg width="${STRIP.w}" height="${STRIP.h}" style="position:absolute;left:0;top:0">
          <line class="c-dcn-base" x1="${TRACK.x}" x2="${TRACK.x + TRACK.w}" y1="${TRACK.y}" y2="${TRACK.y}" />
          ${'<rect class="c-dcn-pulse" width="10" height="26" rx="2" />'.repeat(PULSES)}
          <line class="c-dcn-head" x1="${HEAD_X}" x2="${HEAD_X}" y1="${TRACK.y - 34}" y2="${TRACK.y + 8}" />
        </svg>
      </div>
      <div class="c-dcn-motor" style="position:absolute;transform:rotate(90deg)">${vibration('motor')}</div>`,
    bounds: [STRIP.x, STRIP.y, STRIP.x + STRIP.w * STRIP_ZOOM, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: I2C_WIRES, at: CLICKS }],
  run(t, view) {
    const since = sinceLast(t, CLICKS);
    view.part<Haptic>('HAP1').vibrating = since < BUZZ_MS;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-dcn-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', clickLevel(since));

    view.qa<SVGRectElement>('.c-dcn-pulse').forEach((p, i) => {
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
