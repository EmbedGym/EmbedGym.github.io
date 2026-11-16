import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';
import { DURATION, PRESSES, ZOOM, runZoom, toneAt, zoomHtml } from '../mega/buzzer_button';

const PIN_LABEL = 'pin 2';
const BUTTON_WIRES = ['w-2-BTN', 'w-2-RPD'];
const BUZZER_WIRE = 'w-13-BUZ';

// The zoom on pin 2 sits above the button, right of the pin 2 wires.
const AT = { x: 324, y: -86 };

const buzzerButtonUno: Cell = {
  duration: DURATION,
  decor: {
    html: `${zoomHtml('c-bbu', PIN_LABEL, AT, 22, 'var(--sans)', 'tone on', true)}
      ${sound('buz')}
      ${finger('f', { rotate: 90, length: 64 })}`,
    // The sound rings reach 90 px left of the buzzer disc, which is 34 px right of the board's left edge.
    bounds: [-60, AT.y, AT.x + ZOOM.w, AT.y + ZOOM.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (runZoom(view, 'c-bbu', t, pressing, true, PRESSES, true)) for (const id of BUTTON_WIRES) view.glowWire(id, 1);
    const tone = toneAt(t);
    if (tone) view.glowWire(BUZZER_WIRE, 1);

    // The buzzer lies on its side above the header, so its rings spread left, one every 200 ms while it sounds.
    const buz = view.box('BUZ');
    setSound(view, 'buz', { x: buz.x + 38, y: buz.y + buz.h / 2 }, tone ? (t - tone[0]) / 200 : null, { dir: 'left', from: 50, to: 90 });
  },
};

export default buzzerButtonUno;
