import type { Cell } from '../../cell';
import { finger } from '../../decor/finger';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, readout, runReadout, runTrigger, schedule } from '../mega/mlx90614_trigger_measurement';

// The Uno sketch confirms the trigger 20 ms after each edge, samples every 100 ms
// while held (the short tap too) and prints the maximum on release (115200 baud).
const BOARD = 'arduino-uno';
const DEBOUNCE = 20;
const { sampleAt: SAMPLE_AT, tapAt: TAP_AT, prints: PRINTS } = schedule(DEBOUNCE);
const I2C_WIRES = ['w-SDA', 'w-SCL'];
const PIN10_WIRES = ['w-10-BTN', 'w-10-RPD'];

const PANEL = { x: -316, y: 18, w: 300, h: 82 };
// The readout's fixed 24 px text, scaled up to stay legible at this card's scale.
const READOUT = { x: 336, y: 0, k: 1.2 };
// In front of the sensor's lens, which faces right.
const MUG = { x: 404, y: 146 };

const mlx90614TriggerMeasurementUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-trigger-u', PANEL, { note: '115200', cableTo: USB.uno, fontSize: 29 })}
      <div style="position:absolute;left:${MUG.x}px;top:${MUG.y}px">${mug('mtu')}</div>
      <div style="position:absolute;left:${READOUT.x}px;top:${READOUT.y}px;transform:scale(${READOUT.k});transform-origin:0 0">${readout({ x: 0, y: 0, w: 136, h: 74 })}</div>
      ${finger('f', { length: 48 })}`,
    bounds: [PANEL.x, -160, MUG.x + 46, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: [...SAMPLE_AT, ...TAP_AT] }],
  run(t, view) {
    runTrigger(view, t, PIN10_WIRES);
    runReadout(view, t, DEBOUNCE, SAMPLE_AT, TAP_AT);
    runMug(view, 'mtu', t);
    showSerial(view, 'mlx-trigger-u', t, PRINTS, { board: BOARD });
  },
};

export default mlx90614TriggerMeasurementUno;
