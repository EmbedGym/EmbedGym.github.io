import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';
import { DURATION, PRESSES, ZOOM, runZoom, toneAt, zoomHtml } from '../mega/buzzer_button';

const PIN_LABEL = 'P1.11';
const BUTTON_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];
const BUZZER_WIRE = 'w-P1.15-BZ1';

// The card spans the whole board (VDD and GND.2 are on the bottom header, the
// button beside the right edge), so the zoom is drawn 1.65× to stay readable.
// It sits above the board, over the P1.11 run to the button.
const SIZE = 1.65;
const AT = { x: 170, y: -236 };

const buzzerButtonNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `${zoomHtml('c-bbn', PIN_LABEL, AT, 22, 'var(--sans)', 'tone on', true, SIZE)}
      ${sound('buz')}
      ${finger('f', { rotate: 180, length: 64 })}`,
    bounds: [AT.x, AT.y, AT.x + ZOOM.w * SIZE, AT.y + ZOOM.h * SIZE],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (runZoom(view, 'c-bbn', t, pressing, true, PRESSES, true)) for (const id of BUTTON_WIRES) view.glowWire(id, 1);
    const tone = toneAt(t);
    if (tone) view.glowWire(BUZZER_WIRE, 1);

    // Rings rise from the buzzer left of the header, one every 200 ms while it sounds.
    const buz = view.box('BZ1');
    setSound(view, 'buz', { x: buz.x + 38, y: buz.y + buz.h / 2 }, tone ? (t - tone[0]) / 200 : null, { from: 50, to: 90 });
  },
};

export default buzzerButtonNrf52840;
