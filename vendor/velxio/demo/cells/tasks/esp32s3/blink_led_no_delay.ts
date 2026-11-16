import type { Cell } from '../../cell';
import { INTERVAL, isOn, sinceToggle } from '../mega/blink_led_no_delay';

type Led = HTMLElement & { value: boolean };

const HEAD = 'esp_timer − last';
const SIGNAL_WIRES = ['w-10-R1', 'w-R1-L1'];

// GPIO 10's esp_timer check, left of the LED.
const PANEL = { x: -382, y: 172, w: 270, h: 132 };
const BAR = { x: 18, y: 76, w: 234, h: 16 };

const blinkLedNoDelayEsp32s3: Cell = {
  duration: 4000,
  decor: {
    html: `
      <style>
        .c-bne-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-bne-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-bne-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-bne-track { position: absolute; border-radius: ${BAR.h / 2}px; background: #e8ebf0; overflow: hidden; }
        .c-bne-fill { height: 100%; background: var(--accent); border-radius: ${BAR.h / 2}px; }
        .c-bne-foot { position: absolute; left: 14px; right: 14px; top: 98px; display: flex; justify-content: space-between;
          font-family: var(--mono); font-size: 20px; color: var(--muted); }
        .c-bne-ms { color: var(--ink); }
        .c-bne-flip { color: #00aa00; font-weight: 700; opacity: 0; }
      </style>
      <div class="c-bne-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-bne-head"><span>${HEAD}</span><span>${INTERVAL} ms</span></div>
        <div class="c-bne-track" style="left:${BAR.x}px;top:${BAR.y}px;width:${BAR.w}px;height:${BAR.h}px"><div class="c-bne-fill"></div></div>
        <div class="c-bne-foot"><span class="c-bne-ms"></span><span class="c-bne-flip">toggle!</span></div>
      </div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const on = isOn(t);
    view.part<Led>('L1').value = on;
    if (on) for (const id of SIGNAL_WIRES) view.glowWire(id, 1);
    const { elapsed, flip } = sinceToggle(t);
    view.q<HTMLElement>('.c-bne-fill').style.width = `${(100 * elapsed) / INTERVAL}%`;
    view.q<HTMLElement>('.c-bne-ms').textContent = `${String(Math.floor(elapsed)).padStart(3, ' ')} ms`;
    view.q<HTMLElement>('.c-bne-flip').style.opacity = String(flip);
  },
};

export default blinkLedNoDelayEsp32s3;
