import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';

type Led = HTMLElement & { value: boolean };

// Each press advances the blink rate (1 Hz → 2 Hz → 4 Hz → off → 1 Hz …), beeps
// for 100 ms and restarts the blink from off. The loop opens on the press that
// returns to 1 Hz, so it closes on the same press with no jump.
export const DURATION = 5750;
export const PRESS_AT = [0, 2000, 3500, 4750];
export const PRESS_LEN = 120;
export const MODES = [
  { label: '1 Hz', half: 500 },
  { label: '2 Hz', half: 250 },
  { label: '4 Hz', half: 125 },
  { label: 'off', half: 0 },
];
export const BEEP = 100;

export function stateAt(t: number) {
  const k = PRESS_AT.filter((p) => p <= t).length - 1;
  const mode = MODES[k];
  const since = t - PRESS_AT[k];
  const ledOn = mode.half > 0 && Math.floor(since / mode.half) % 2 === 1;
  return { k, ledOn, beeping: since < BEEP };
}

// The press at DURATION is the loop's opening press, so the finger comes down for it.
export const PRESSES = [...PRESS_AT, DURATION].map((p): [number, number] => [p, p + PRESS_LEN]);

const PANEL = { x: -240, y: -122, w: 298, h: 112 };
const CHIP = { x: 16, y: 54, w: 62, h: 40, gap: 6 };

const buzzerToggleLedFreq: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tl-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-tl-head { position: absolute; left: 16px; right: 16px; top: 12px; display: flex; justify-content: space-between;
          font-size: 22px; font-weight: 700; color: var(--ink); }
        .c-tl-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-tl-chip {
          position: absolute; top: ${CHIP.y}px; width: ${CHIP.w}px; height: ${CHIP.h}px; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center; border-radius: 9px;
          font-family: var(--mono); font-size: 22px; color: var(--muted); background: #f1f3f6; border: 1.5px solid #e2e6ec;
        }
        .c-tl-chip.on { color: #ffffff; background: #ff8800; border-color: #ff8800; font-weight: 700; }
      </style>
      <div class="c-tl-panel">
        <div class="c-tl-head"><span>LED pin 4</span><span>blink rate</span></div>
        ${MODES.map((m, i) => `<div class="c-tl-chip" data-k="${i}" style="left:${CHIP.x + i * (CHIP.w + CHIP.gap)}px">${m.label}</div>`).join('')}
      </div>
      ${sound('buz')}
      ${finger('f')}`,
    bounds: [PANEL.x, -222, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const { k, ledOn, beeping } = stateAt(t);
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }
    view.part<Led>('L1').value = ledOn;
    if (ledOn) {
      view.glowWire('w-4-R1', 1);
      view.glowWire('w-R1-L1', 1);
    }
    if (beeping) view.glowWire('w-3-BZ1', 1);
    view.qa<HTMLElement>('.c-tl-chip').forEach((chip) => chip.classList.toggle('on', Number(chip.dataset.k) === k));

    // Three sound rings rise from the upside-down buzzer over the GND trunk during the 100 ms beep.
    const buz = view.box('BZ1');
    const since = t - PRESS_AT[k];
    setSound(view, 'buz', { x: buz.x + buz.w / 2, y: buz.y + buz.h - 38 }, since / 23, { from: 84, to: 104, count: 3 });
  },
};

export default buzzerToggleLedFreq;
