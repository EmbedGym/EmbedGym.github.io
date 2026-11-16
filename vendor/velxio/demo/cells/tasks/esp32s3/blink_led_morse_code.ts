import type { Cell } from '../../cell';
import { DURATION, MARKS, marksHtml, morseState } from '../mega/blink_led_morse_code';

type Led = HTMLElement & { value: boolean };

const PIN_LABEL = 'GPIO 10';
const SIGNAL_WIRES = ['w-10-R1', 'w-R1-L1'];

// The SOS being sent, left of the LED.
const PANEL = { x: -402, y: 172, w: 290, h: 132 };

const blinkLedMorseCodeEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-bme-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-bme-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-bme-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-bme-mark { fill: #d6dbe2; }
        .c-bme-mark.done { fill: color-mix(in srgb, #d6dbe2 calc(100% * var(--reset, 0)), #8fd18f); }
        .c-bme-mark.now { fill: #00aa00; }
        .c-bme-letter { font-family: var(--mono); font-size: 26px; font-weight: 700; fill: #b6bdc7; }
        .c-bme-letter.now { fill: var(--ink); }
      </style>
      <div class="c-bme-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-bme-head"><span>Morse</span><span>${PIN_LABEL}</span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">${marksHtml('c-bme')}</svg>
      </div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const { current, on, letter, reset } = morseState(t);
    view.part<Led>('L1').value = on;
    if (on) for (const id of SIGNAL_WIRES) view.glowWire(id, 1);
    view.qa<SVGElement>('.c-bme-mark').forEach((el) => {
      const n = Number(el.dataset.n);
      const m = MARKS[n];
      el.classList.toggle('now', n === current);
      el.classList.toggle('done', n !== current && m.start + m.len <= t);
    });
    view.q<SVGElement>('.c-bme-panel svg').style.setProperty('--reset', String(reset));
    view.qa<SVGElement>('.c-bme-letter').forEach((el) => el.classList.toggle('now', Number(el.dataset.l) === letter));
  },
};

export default blinkLedMorseCodeEsp32s3;
