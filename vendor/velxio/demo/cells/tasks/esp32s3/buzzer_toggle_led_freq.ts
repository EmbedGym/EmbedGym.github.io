import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';
import { DURATION, MODES, PRESS_AT, PRESSES, stateAt } from '../mega/buzzer_toggle_led_freq';

type Led = HTMLElement & { value: boolean };

const LED_PIN = 'GPIO 11';
const BUTTON_WIRES = ['w-12-BTN', 'w-12-RPD'];
const LED_WIRES = ['w-11-R1', 'w-R1-L1'];
const BUZZER_WIRE = 'w-10-BZ1';

// The blink-rate panel, below the parts, left of the board's bottom end. The
// circuit fills the board's left side, so the card is drawn small and the panel enlarged.
const PANEL = { x: -405, y: 325, w: 392, h: 150 };
const CHIP = { x: 16, y: 72, w: 86, h: 58, gap: 6 };

const buzzerToggleLedFreqEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tle-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-tle-head { position: absolute; left: 16px; right: 16px; top: 12px; display: flex; justify-content: space-between;
          font-size: 34px; font-weight: 700; color: var(--ink); }
        .c-tle-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-tle-chip {
          position: absolute; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center; border-radius: 9px;
          font-family: var(--mono); font-size: 33px; white-space: nowrap; color: var(--muted); background: #f1f3f6; border: 1.5px solid #e2e6ec;
        }
        .c-tle-chip.on { color: #ffffff; background: #ff8800; border-color: #ff8800; font-weight: 700; }
      </style>
      <div class="c-tle-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-tle-head"><span>LED blink</span><span>${LED_PIN}</span></div>
        ${MODES.map(
          (m, i) =>
            `<div class="c-tle-chip" data-k="${i}" style="left:${CHIP.x + i * (CHIP.w + CHIP.gap)}px;top:${CHIP.y}px;width:${CHIP.w}px;height:${CHIP.h}px">${m.label}</div>`,
        ).join('')}
      </div>
      ${sound('buz')}
      ${finger('f', { length: 60, rotate: 270 })}`,
    bounds: [PANEL.x, 20, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const { k, ledOn, beeping } = stateAt(t);
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) for (const id of BUTTON_WIRES) view.glowWire(id, 1);
    view.part<Led>('L1').value = ledOn;
    if (ledOn) for (const id of LED_WIRES) view.glowWire(id, 1);
    if (beeping) view.glowWire(BUZZER_WIRE, 1);
    view.qa<HTMLElement>('.c-tle-chip').forEach((chip) => chip.classList.toggle('on', Number(chip.dataset.k) === k));

    // Sound rings leave the buzzer's disc to the left during the 100 ms beep.
    const buz = view.box('BZ1');
    const since = t - PRESS_AT[k];
    setSound(view, 'buz', { x: buz.x + 38, y: buz.y + buz.h / 2 }, since / 23, { dir: 'left', from: 50, to: 72, count: 3 });
  },
};

export default buzzerToggleLedFreqEsp32s3;
