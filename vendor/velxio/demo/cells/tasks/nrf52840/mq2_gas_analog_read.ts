import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { CLEAN, DURATION, GASSY, aoVolts, gasHtml, printsFor, runGas } from '../mega/mq2_gas_analog_read';

// Zephyr: P0.03 (AIN1) sees 0.6 × AO through the 100k/150k divider; a 12-bit
// SAADC read at gain 1/6 against the 0.6 V reference (3.6 V full scale), turned
// into AO in hundredths of a volt with integer maths, then a 1 s sleep.
const AO_WIRE = 'w2';
const P003_WIRES = ['w3', 'w4'];
const READS = [0, 1000, 2000, 3000, 4000];

const line = (volts: number) => {
  const raw = Math.round(((0.6 * volts) / 3.6) * 4096);
  const uv = Math.floor((raw * 3600000) / 4096);
  const centivolts = Math.round(Math.floor((uv * 10) / 6) / 10000);
  return `Raw: ${raw} Voltage: ${Math.floor(centivolts / 100)}.${String(centivolts % 100).padStart(2, '0')} V`;
};
const PRINTS = printsFor(READS, line);
// Each line wraps to two rows; two readings.
const PANEL = { x: -304, y: 70, w: 290, h: 180 };
// Left of the sensor, its gas drifting onto the mesh head.
const NOZZLE = { x: -64, y: 336 };

const mq2GasAnalogReadNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mq2n', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true })}
      ${gasHtml('mq2n', NOZZLE)}`,
    bounds: [PANEL.x, PANEL.y, NOZZLE.x + 10, NOZZLE.y + 17],
  },
  run(t, view) {
    const box = view.box('GAS1');
    runGas(view, 'mq2n', t, NOZZLE, { x: box.x + 44.6, y: box.y + box.h / 2 });
    const level = clamp((aoVolts(t) - CLEAN) / (GASSY - CLEAN));
    view.glowWire(AO_WIRE, level);
    for (const id of P003_WIRES) view.glowWire(id, level);
    showSerial(view, 'mq2n', t, PRINTS);
  },
};

export default mq2GasAnalogReadNrf52840;
