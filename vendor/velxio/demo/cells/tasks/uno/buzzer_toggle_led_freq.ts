import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';
import { DURATION, MODES, PRESS_AT, PRESSES, stateAt } from '../mega/buzzer_toggle_led_freq';

type Led = HTMLElement & { value: boolean };

const BUTTON_WIRES = ['w-2-BTN', 'w-2-RPD'];
const LED_WIRES = ['w-4-R1', 'w-R1-L1'];

// The blink-rate panel sits above the board's left end, beside the LED. 5V and the pull-down's
// GND are on the board's bottom edge, so the card spans the full board and the text is enlarged.
const PANEL = { x: -296, y: -162, w: 350, h: 136 };
const CHIP = { x: 16, y: 64, w: 76, h: 54, gap: 6 };

const buzzerToggleLedFreqUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tlu-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-tlu-head { position: absolute; left: 16px; right: 16px; top: 12px; display: flex; justify-content: space-between;
          font-size: 30px; font-weight: 700; color: var(--ink); }
        .c-tlu-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-tlu-chip {
          position: absolute; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center; border-radius: 9px;
          font-family: var(--mono); font-size: 29px; white-space: nowrap; color: var(--muted); background: #f1f3f6; border: 1.5px solid #e2e6ec;
        }
        .c-tlu-chip.on { color: #ffffff; background: #ff8800; border-color: #ff8800; font-weight: 700; }
      </style>
      <div class="c-tlu-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-tlu-head"><span>LED blink</span><span>pin 4</span></div>
        ${MODES.map(
          (m, i) =>
            `<div class="c-tlu-chip" data-k="${i}" style="left:${CHIP.x + i * (CHIP.w + CHIP.gap)}px;top:${CHIP.y}px;width:${CHIP.w}px;height:${CHIP.h}px">${m.label}</div>`,
        ).join('')}
      </div>
      ${sound('buz')}
      ${finger('f', { length: 60, rotate: 90 })}`,
    bounds: [PANEL.x, -165, 460, PANEL.y + PANEL.h],
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
    if (beeping) view.glowWire('w-3-BZ1', 1);
    view.qa<HTMLElement>('.c-tlu-chip').forEach((chip) => chip.classList.toggle('on', Number(chip.dataset.k) === k));

    // The buzzer hangs upside down with its legs on top; the rings rise over its two wires during the 100 ms beep.
    const buz = view.box('BZ1');
    const since = t - PRESS_AT[k];
    setSound(view, 'buz', { x: buz.x + buz.w / 2, y: buz.y + buz.h / 2 }, since / 23, { from: 66, to: 86, count: 3 });
  },
};

export default buzzerToggleLedFreqUno;
