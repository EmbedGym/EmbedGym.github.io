import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { BREATH_IN, BREATH_OUT, DURATION, PRINTS, READS, breath } from '../mega/dht11_read';

const DATA_WIRE = 'w-P1.02-DATA';

const PANEL = { x: -290, y: 82, w: 250, h: 162 };

const dht11ReadNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('dhtn', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: 22 })}
      ${cloud('dhtn', { kind: 'breath', scale: 0.8 })}`,
    bounds: [PANEL.x, -20, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: [DATA_WIRE], at: READS }],
  run(t, view) {
    // The breath drifts in from the left onto the sensor's grille, then thins away.
    const box = view.box('H1');
    const x = lerp(box.x - 40, box.x - 12, clamp((t - BREATH_IN) / (BREATH_OUT - BREATH_IN)));
    setCloud(view, 'dhtn', { x, y: box.y + box.h / 2 - 8 }, breath(t));
    view.glowWire(DATA_WIRE, READS.some((r) => t >= r && t < r + 250) ? 1 : 0);
    showSerial(view, 'dhtn', t, PRINTS);
  },
};

export default dht11ReadNrf52840;
