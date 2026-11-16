import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';
import { DURATION, MODES, PRESS_AT, PRESSES, stateAt } from '../mega/buzzer_toggle_led_freq';

type Led = HTMLElement & { value: boolean };

const BUTTON_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];
const LED_WIRES = ['w-P1.12-R1', 'w-R1-L1'];

// VDD and the pull-down's GND are on the bottom header, so the card spans the whole
// board and is drawn small: the panel stacks its chips two by two left of the board
// and the text is enlarged.
const PANEL = { x: -236, y: -150, w: 212, h: 200 };
const CHIP = { x: 16, y: 64, w: 87, h: 56, gap: 6 };

const buzzerToggleLedFreqNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tln-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-tln-head { position: absolute; left: 16px; right: 16px; top: 12px; display: flex; justify-content: space-between;
          font-size: 32px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-tln-chip {
          position: absolute; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center; border-radius: 9px;
          font-family: var(--mono); font-size: 31px; white-space: nowrap; color: var(--muted); background: #f1f3f6; border: 1.5px solid #e2e6ec;
        }
        .c-tln-chip.on { color: #ffffff; background: #ff8800; border-color: #ff8800; font-weight: 700; }
      </style>
      <div class="c-tln-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-tln-head"><span>LED blink</span></div>
        ${MODES.map(
          (m, i) =>
            `<div class="c-tln-chip" data-k="${i}" style="left:${CHIP.x + (i % 2) * (CHIP.w + CHIP.gap)}px;top:${CHIP.y + Math.floor(i / 2) * (CHIP.h + CHIP.gap)}px;width:${CHIP.w}px;height:${CHIP.h}px">${m.label}</div>`,
        ).join('')}
      </div>
      ${sound('buz')}
      ${finger('f', { length: 60, rotate: 90 })}`,
    bounds: [PANEL.x, -160, 680, PANEL.y + PANEL.h],
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
    if (beeping) view.glowWire('w-P1.15-BZ1', 1);
    view.qa<HTMLElement>('.c-tln-chip').forEach((chip) => chip.classList.toggle('on', Number(chip.dataset.k) === k));

    // The buzzer hangs upside down; the rings leave its disc to the right, past its signal wire, during the 100 ms beep.
    const buz = view.box('BZ1');
    const since = t - PRESS_AT[k];
    setSound(view, 'buz', { x: buz.x + buz.w / 2, y: buz.y + buz.h / 2 }, since / 23, { dir: 'right', from: 56, to: 80, count: 3 });
  },
};

export default buzzerToggleLedFreqNrf52840;
