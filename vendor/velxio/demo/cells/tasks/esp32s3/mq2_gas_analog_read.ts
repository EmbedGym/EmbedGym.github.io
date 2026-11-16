import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { CLEAN, DURATION, GASSY, aoVolts, gasHtml, printsFor, runGas } from '../mega/mq2_gas_analog_read';

// ESP-IDF: GPIO4 sees 0.6 × AO through the 100k/150k divider; a 12-bit read at
// 11 dB scaled back to AO, every 1000 ms from boot, at 115200 baud.
const AO_WIRE = 'w2';
const GPIO4_WIRES = ['w3', 'w4'];
const READS = [0, 1000, 2000, 3000, 4000];

const line = (volts: number) => {
  const raw = Math.round(((0.6 * volts) / 3.3) * 4095);
  return `Raw: ${raw} Voltage: ${((raw * 3.3) / 4095 / 0.6).toFixed(2)} V`;
};
const PRINTS = printsFor(READS, line);
// The board is tall, so the card's scale is low: the panel is wide and its text large.
const PANEL = { x: -238, y: 374, w: 540, h: 131 };
// Above the sensor, the gas sinking onto its mesh head.
const NOZZLE = { x: -212, y: 212 };

const mq2GasAnalogReadEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mq2e', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 32 })}
      ${gasHtml('mq2e', NOZZLE)}`,
    bounds: [NOZZLE.x - 110, NOZZLE.y - 23, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const box = view.box('GAS1');
    runGas(view, 'mq2e', t, NOZZLE, { x: box.x + 44.6, y: box.y + box.h / 2 });
    const level = clamp((aoVolts(t) - CLEAN) / (GASSY - CLEAN));
    view.glowWire(AO_WIRE, level);
    for (const id of GPIO4_WIRES) view.glowWire(id, level);
    showSerial(view, 'mq2e', t, PRINTS);
  },
};

export default mq2GasAnalogReadEsp32s3;
