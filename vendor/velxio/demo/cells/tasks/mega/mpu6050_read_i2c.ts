import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// The sensor's Z acceleration drops from 1 g to 0.25 g while it reads a steady
// -50 °/s about X. Every ~206 ms the sketch reads all six axes over I2C and prints them.
const DURATION = 3600;
const CHANGE = 1400;
const PERIOD = 206;
const GX = -6550;

const aZAt = (t: number) => (t >= CHANGE ? 4096 : 16384);
// The first line goes out ~6 ms into loop(): the 14-byte read, then ~4 ms of printing.
const PRINTS: Print[] = Array.from({ length: Math.floor((DURATION - 400) / PERIOD) }, (_, i) => {
  const t = 6 + i * PERIOD;
  // The line is shown over three rows, broken after aY and gX so no label is parted from its value.
  return { t, text: `aX: 0 aY: 0\naZ: ${aZAt(t - 4)} gX: ${GX}\ngY: 0 gZ: 0` };
});

const PANEL = { x: -370, y: USB.mega.y - 128, w: 350, h: 250 };
// What the sensor feels, right of the module and above its wire lanes.
const INPUT = { x: 140, y: -160, w: 210 };

const mpu6050ReadI2c: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mpu-in {
          position: absolute; left: ${INPUT.x}px; top: ${INPUT.y}px; width: ${INPUT.w}px;
          box-sizing: border-box; padding: 6px 14px 8px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 27px/1.35 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mpu-in b { font-weight: 600; color: var(--muted); }
        .c-mpu-fresh { color: var(--accent); }
        .c-mpu-title { font: 600 25px var(--sans); color: var(--muted); }
      </style>
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      <div class="c-mpu-in"><div class="c-mpu-title">Sensor input</div><div><b>aZ</b> <span data-k="az"></span></div><div><b>gX</b> -50 °/s</div></div>`,
    bounds: [PANEL.x, INPUT.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const az = view.q<HTMLElement>('[data-k="az"]');
    az.textContent = t >= CHANGE ? '0.25 g' : '1.00 g';
    az.classList.toggle('c-mpu-fresh', t >= CHANGE && t < CHANGE + 600);
    view.q<HTMLElement>('.c-mpu-in').style.opacity = String(Math.min(clamp(t / 250), 1 - clamp((t - (DURATION - 300)) / 300)));
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: DURATION - 300 });
  },
  activity: [{ wires: ['w-20-SDA', 'w-21-SCL'], at: PRINTS.map((p) => p.t - 5) }],
};

export default mpu6050ReadI2c;
