import type { Cell } from '../../cell';
import { INTERVAL, isOn, sinceToggle } from '../mega/blink_led_no_delay';

type Led = HTMLElement & { value: boolean };

const HEAD = 'millis() − last';
const SIGNAL_WIRES = ['w-3-R1', 'w-R1-L1'];

// pin 3's millis() check, above the board left of the LED.
const PANEL = { x: -186, y: -142, w: 270, h: 132 };
const BAR = { x: 18, y: 76, w: 234, h: 16 };

const blinkLedNoDelayUno: Cell = {
  duration: 4000,
  decor: {
    html: `
      <style>
        .c-bnu-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-bnu-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-bnu-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-bnu-track { position: absolute; border-radius: ${BAR.h / 2}px; background: #e8ebf0; overflow: hidden; }
        .c-bnu-fill { height: 100%; background: var(--accent); border-radius: ${BAR.h / 2}px; }
        .c-bnu-foot { position: absolute; left: 14px; right: 14px; top: 98px; display: flex; justify-content: space-between;
          font-family: var(--mono); font-size: 20px; color: var(--muted); }
        .c-bnu-ms { color: var(--ink); }
        .c-bnu-flip { color: #00aa00; font-weight: 700; opacity: 0; }
      </style>
      <div class="c-bnu-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-bnu-head"><span>${HEAD}</span><span>${INTERVAL} ms</span></div>
        <div class="c-bnu-track" style="left:${BAR.x}px;top:${BAR.y}px;width:${BAR.w}px;height:${BAR.h}px"><div class="c-bnu-fill"></div></div>
        <div class="c-bnu-foot"><span class="c-bnu-ms"></span><span class="c-bnu-flip">toggle!</span></div>
      </div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const on = isOn(t);
    view.part<Led>('L1').value = on;
    if (on) for (const id of SIGNAL_WIRES) view.glowWire(id, 1);
    const { elapsed, flip } = sinceToggle(t);
    view.q<HTMLElement>('.c-bnu-fill').style.width = `${(100 * elapsed) / INTERVAL}%`;
    view.q<HTMLElement>('.c-bnu-ms').textContent = `${String(Math.floor(elapsed)).padStart(3, ' ')} ms`;
    view.q<HTMLElement>('.c-bnu-flip').style.opacity = String(flip);
  },
};

export default blinkLedNoDelayUno;
