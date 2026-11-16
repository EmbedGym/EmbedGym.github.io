import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';
import { DURATION, PRESSES, SCOPE, runScope, toneAt, scopeHtml } from '../mega/buzzer_doorbell';

const PINS: [string, string] = ['pin 2', 'pin 13'];
const BUTTON_WIRES = ['w-2-BTN', 'w-2-RPD'];
const BUZZER_WIRE = 'w-13-BUZ';
const BUZZER = 'BUZ';

// The scope sits above the button, right of the pin 2 wires.
const AT = { x: 324, y: -86 };

const buzzerDoorbellUno: Cell = {
  duration: DURATION,
  decor: {
    html: `${scopeHtml('c-bdu', PINS, AT, 22)}
      ${sound('buz')}
      ${finger('f', { rotate: 90, length: 64 })}`,
    bounds: [AT.x, AT.y, AT.x + SCOPE.w, AT.y + SCOPE.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) for (const id of BUTTON_WIRES) view.glowWire(id, 1);
    const tone = toneAt(t);
    if (tone) view.glowWire(BUZZER_WIRE, 1);
    runScope(view, 'c-bdu', t);

    // The buzzer lies on its side above the header, so its rings spread left, one every 200 ms while it sounds.
    const buz = view.box(BUZZER);
    setSound(view, 'buz', { x: buz.x + 38, y: buz.y + buz.h / 2 }, tone ? (t - tone[0]) / 200 : null, { dir: 'left', from: 50, to: 90 });
  },
};

export default buzzerDoorbellUno;
