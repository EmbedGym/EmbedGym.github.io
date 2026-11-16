import type { Cell } from '../../cell';
import { finger } from '../../decor/finger';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, readout, runReadout, runTrigger, schedule } from '../mega/mlx90614_trigger_measurement';

// The Zephyr build confirms the trigger 10 ms after each edge, samples on the
// confirmed press and then on a 100 ms grid from the press edge while held (the
// short tap too), and prints the maximum on release (printk "%.1f", 115200 baud).
const DEBOUNCE = 10;
const { sampleAt: SAMPLE_AT, tapAt: TAP_AT, prints: PRINTS } = schedule(DEBOUNCE, 'edge');
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const P111_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];

const PANEL = { x: -438, y: 80, w: 330, h: 85 };
// The readout's fixed 24 px text, scaled up to stay legible at this card's scale.
const READOUT = { x: 180, y: -148, k: 1.3 };
// Beside the sensor, above the board.
const MUG = { x: -54, y: -112 };

const mlx90614TriggerMeasurementNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-trigger-n', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: 31 })}
      <div style="position:absolute;left:${MUG.x}px;top:${MUG.y}px">${mug('mtn')}</div>
      <div style="position:absolute;left:${READOUT.x}px;top:${READOUT.y}px;transform:scale(${READOUT.k});transform-origin:0 0">${readout({ x: 0, y: 0, w: 136, h: 74 })}</div>
      ${finger('f', { length: 48, rotate: 180 })}`,
    bounds: [PANEL.x, READOUT.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: [...SAMPLE_AT, ...TAP_AT] }],
  run(t, view) {
    runTrigger(view, t, P111_WIRES);
    runReadout(view, t, DEBOUNCE, SAMPLE_AT, TAP_AT);
    runMug(view, 'mtn', t);
    // Only this loop's line, faded out before the loop restarts, so the release's print stands out.
    showSerial(view, 'mlx-trigger-n', t, PRINTS.filter((p) => p.t > 0), { fadeFrom: DURATION - 400 });
  },
};

export default mlx90614TriggerMeasurementNrf52840;
