import type { Cell } from '../../cell';
import { finger } from '../../decor/finger';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, readout, runReadout, runTrigger, schedule } from '../mega/mlx90614_trigger_measurement';

// The ESP-IDF build confirms the trigger 20 ms after each edge, samples every
// 100 ms while held (the short tap too) and prints the maximum on release
// (printf "%.1f", 115200 baud).
const DEBOUNCE = 20;
const { sampleAt: SAMPLE_AT, tapAt: TAP_AT, prints: PRINTS } = schedule(DEBOUNCE);
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];
const PIN12_WIRES = ['w-12-BTN', 'w-12-RPD'];

const PANEL = { x: -146, y: 380, w: 420, h: 100 };
// The readout's fixed 24 px text, scaled up to stay legible at this card's scale.
const READOUT = { x: 140, y: 200, k: 1.6 };
// Beside the sensor, above the board.
const MUG = { x: 198, y: -28 };

const mlx90614TriggerMeasurementEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-trigger-e', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 40 })}
      <div style="position:absolute;left:${MUG.x}px;top:${MUG.y}px">${mug('mte')}</div>
      <div style="position:absolute;left:${READOUT.x}px;top:${READOUT.y}px;transform:scale(${READOUT.k});transform-origin:0 0">${readout({ x: 0, y: 0, w: 136, h: 74 })}</div>
      ${finger('f', { length: 48 })}`,
    bounds: [-130, MUG.y - 24, READOUT.x + 136 * READOUT.k, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: [...SAMPLE_AT, ...TAP_AT] }],
  run(t, view) {
    runTrigger(view, t, PIN12_WIRES);
    runReadout(view, t, DEBOUNCE, SAMPLE_AT, TAP_AT);
    runMug(view, 'mte', t);
    // Only this loop's line, faded out before the loop restarts, so the release's print stands out.
    showSerial(view, 'mlx-trigger-e', t, PRINTS.filter((p) => p.t > 0), { fadeFrom: DURATION - 400 });
  },
};

export default mlx90614TriggerMeasurementEsp32s3;
