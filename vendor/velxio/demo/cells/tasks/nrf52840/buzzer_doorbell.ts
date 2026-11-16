import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';
import { DURATION, PRESSES, SCOPE, runScope, toneAt, scopeHtml } from '../mega/buzzer_doorbell';

const PINS: [string, string] = ['P1.11', 'P1.15'];
const BUTTON_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];
const BUZZER_WIRE = 'w-P1.15-BZ1';
const BUZZER = 'BZ1';

// The card spans the whole board (VDD and GND.2 are on the bottom header, the
// button beside the right edge), so the scope is drawn 1.35× to stay readable.
// It sits above the board, over the P1.11 run to the button.
const SIZE = 1.35;
const AT = { x: 170, y: -257 };

const buzzerDoorbellNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `${scopeHtml('c-bdn', PINS, AT, 28, SIZE)}
      ${sound('buz')}
      ${finger('f', { rotate: 180, length: 64 })}`,
    bounds: [AT.x, AT.y, AT.x + SCOPE.w * SIZE, AT.y + SCOPE.h * SIZE],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) for (const id of BUTTON_WIRES) view.glowWire(id, 1);
    const tone = toneAt(t);
    if (tone) view.glowWire(BUZZER_WIRE, 1);
    runScope(view, 'c-bdn', t);

    // Rings rise from the buzzer left of the header, one every 200 ms while it sounds.
    const buz = view.box(BUZZER);
    setSound(view, 'buz', { x: buz.x + 38, y: buz.y + buz.h / 2 }, tone ? (t - tone[0]) / 200 : null, { from: 50, to: 90 });
  },
};

export default buzzerDoorbellNrf52840;
