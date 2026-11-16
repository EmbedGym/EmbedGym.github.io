import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { BREATH_IN, BREATH_OUT, DURATION, PRINTS, READS, breath } from '../mega/dht11_read';

const BOARD = 'arduino-uno';
const DATA_WIRE = 'w-2-DATA';

const PANEL = { x: -244, y: -12, w: 230, h: 180 };

const dht11ReadUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('dhtu', PANEL, { note: '115200', cableTo: USB.uno, wrap: true, fontSize: 22 })}
      ${cloud('dhtu', { kind: 'breath', scale: 0.8 })}`,
    bounds: [PANEL.x, PANEL.y, 454, PANEL.y + PANEL.h],
  },
  activity: [{ wires: [DATA_WIRE], at: READS }],
  run(t, view) {
    // The breath drifts in from the right onto the sensor's grille, then thins away.
    const box = view.box('D1');
    const x = lerp(box.x + box.w + 8, box.x + box.w - 16, clamp((t - BREATH_IN) / (BREATH_OUT - BREATH_IN)));
    setCloud(view, 'dhtu', { x, y: box.y + box.h / 2 - 8 }, breath(t));
    view.glowWire(DATA_WIRE, READS.some((r) => t >= r && t < r + 250) ? 1 : 0);
    showSerial(view, 'dhtu', t, PRINTS, { board: BOARD });
  },
};

export default dht11ReadUno;
