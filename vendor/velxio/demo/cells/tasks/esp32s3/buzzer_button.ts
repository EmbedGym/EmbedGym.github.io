import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';
import { DURATION, PRESSES, ZOOM, runZoom, toneAt, zoomHtml } from '../mega/buzzer_button';

const PIN_LABEL = 'IO12';
const BUTTON_WIRES = ['w-12-BTN', 'w-12-RPD'];
const BUZZER_WIRE = 'w-13-BUZ';

// The zoom on GPIO12 sits left of the button, above the buzzer's sound rings.
const AT = { x: -402, y: 70 };

const buzzerButtonEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `${zoomHtml('c-bbe', PIN_LABEL, AT, 23, 'var(--sans)', 'tone on', true)}
      ${sound('buz')}
      ${finger('f', { length: 80 })}`,
    bounds: [AT.x, AT.y, AT.x + ZOOM.w, AT.y + ZOOM.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (runZoom(view, 'c-bbe', t, pressing, true, PRESSES, true)) for (const id of BUTTON_WIRES) view.glowWire(id, 1);
    const tone = toneAt(t);
    if (tone) view.glowWire(BUZZER_WIRE, 1);

    // The buzzer lies on its side left of GND.1, so its rings spread left, one every 200 ms while it sounds.
    const buz = view.box('BUZ');
    setSound(view, 'buz', { x: buz.x + 38, y: buz.y + buz.h / 2 }, tone ? (t - tone[0]) / 200 : null, { dir: 'left', from: 50, to: 90 });
  },
};

export default buzzerButtonEsp32s3;
