import { clamp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// As the Mega card: the sensor's Z acceleration drops from 1 g to 0.25 g while it reads a steady
// -50 °/s about X. Every `period` ms the firmware reads all six axes over I2C and prints them.
export const DURATION = 3600;
const CHANGE = 1400;
const GX = -6550;

const aZAt = (t: number) => (t >= CHANGE ? 4096 : 16384);

/** One line per read; `first` is when the first goes out. Shown over three rows, broken after aY and gX. */
export function mpuPrints(first: number, period: number): Print[] {
  return Array.from({ length: Math.floor((DURATION - 400 - first) / period) + 1 }, (_, i) => {
    const t = first + i * period;
    return { t, text: `aX: 0 aY: 0\naZ: ${aZAt(t - 4)} gX: ${GX}\ngY: 0 gZ: 0` };
  });
}

/** The "Sensor input" box: what the sensor feels, at (x, y), `w` wide, `font` px text. */
export function inputBox(key: string, r: { x: number; y: number; w: number }, font: number): string {
  const row = `font:600 ${font}px/1.35 var(--mono);white-space:pre`;
  return `
    <div data-mpu="${key}" style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;box-sizing:border-box;padding:6px 14px 8px;background:#f8fafc;border:1.5px solid #cfd6df;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,0.08);color:var(--ink)">
      <div style="font:600 ${font}px var(--sans);color:var(--muted)">Sensor input</div>
      <div style="${row}"><span style="color:var(--muted)">aZ</span> <span data-k="az"></span></div>
      <div style="${row}"><span style="color:var(--muted)">gX</span> -50 °/s</div>
    </div>`;
}

/** The input box's height for `font` px text. */
export const inputBoxH = (font: number) => Math.ceil(6 + 1.2 * font + 2 * 1.35 * font + 8 + 3);

/** Updates the input box and fades it with the monitor at the loop's ends. */
export function runInput(view: CellView, key: string, t: number) {
  const box = view.q<HTMLElement>(`[data-mpu="${key}"]`);
  const az = box.querySelector<HTMLElement>('[data-k="az"]')!;
  az.textContent = t >= CHANGE ? '0.25 g' : '1.00 g';
  az.style.color = t >= CHANGE && t < CHANGE + 600 ? 'var(--accent)' : '';
  box.style.opacity = String(Math.min(clamp(t / 250), 1 - clamp((t - (DURATION - 300)) / 300)));
}

// The Uno sketch is the Mega's: delay(200) plus ~6 ms of reading and printing.
const PRINTS = mpuPrints(6, 206);
const FONT = 25;
// One reading on three rows: 34 + 3 x 34 + 10.
const PANEL = { x: -370, y: -10, w: 350, h: 146 };
const INPUT = { x: -370, y: 160, w: 230 };

const mpu6050ReadI2cUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.uno, wrap: true, fontSize: FONT })}
      ${inputBox('in', INPUT, 27)}`,
    bounds: [PANEL.x, PANEL.y, 282, 307],
  },
  activity: [{ wires: ['w-A4-SDA', 'w-A5-SCL'], at: PRINTS.map((p) => p.t - 5) }],
  run(t, view) {
    runInput(view, 'in', t);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno', fadeFrom: DURATION - 300 });
  },
};

export default mpu6050ReadI2cUno;
