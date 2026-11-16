import { clamp } from '../../anim';
import type { Cell } from '../../cell';

type Led = HTMLElement & { value: boolean };

// The sketch polls millis() and toggles the LED once 500 ms have passed since
// the last toggle, starting off.
export const INTERVAL = 500;
export const isOn = (t: number) => Math.floor(t / INTERVAL) % 2 === 1;

// Time since the last toggle, and how strongly the "toggle!" cue shows
// (power-on starts the LED off without a toggle).
export function sinceToggle(t: number) {
  const elapsed = t % INTERVAL;
  return { elapsed, flip: t >= INTERVAL ? clamp(1 - elapsed / 250) : 0 };
}

const PANEL = { x: -186, y: -142, w: 270, h: 132 };
const BAR = { x: 18, y: 76, w: 234, h: 16 };

const blinkLedNoDelay: Cell = {
  duration: 4000,
  decor: {
    html: `
      <style>
        .c-bn-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-bn-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-bn-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-bn-track { position: absolute; left: ${BAR.x}px; top: ${BAR.y}px; width: ${BAR.w}px; height: ${BAR.h}px;
          border-radius: ${BAR.h / 2}px; background: #e8ebf0; overflow: hidden; }
        .c-bn-fill { height: 100%; background: var(--accent); border-radius: ${BAR.h / 2}px; }
        .c-bn-foot { position: absolute; left: 14px; right: 14px; top: 98px; display: flex; justify-content: space-between;
          font-family: var(--mono); font-size: 20px; color: var(--muted); }
        .c-bn-ms { color: var(--ink); }
        .c-bn-flip { color: #00aa00; font-weight: 700; opacity: 0; }
      </style>
      <div class="c-bn-panel">
        <div class="c-bn-head"><span>millis() − last</span><span>500 ms</span></div>
        <div class="c-bn-track"><div class="c-bn-fill"></div></div>
        <div class="c-bn-foot"><span class="c-bn-ms"></span><span class="c-bn-flip">toggle!</span></div>
      </div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const on = isOn(t);
    view.part<Led>('L1').value = on;
    if (on) {
      view.glowWire('w-3-R1', 1);
      view.glowWire('w-R1-L1', 1);
    }
    const { elapsed, flip } = sinceToggle(t);
    view.q<HTMLElement>('.c-bn-fill').style.width = `${(100 * elapsed) / INTERVAL}%`;
    view.q<HTMLElement>('.c-bn-ms').textContent = `${String(Math.floor(elapsed)).padStart(3, ' ')} ms`;
    view.q<HTMLElement>('.c-bn-flip').style.opacity = String(flip);
  },
};

export default blinkLedNoDelay;
