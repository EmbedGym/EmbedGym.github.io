import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { CLEAN, DURATION, GASSY, READS, aoVolts, gasHtml, printsFor, runGas } from '../mega/mq2_gas_analog_read';

// The Uno sketch divides by 1023 where the Mega's divides by 1024.
const BOARD = 'arduino-uno';
const AO_WIRE = 'w-A0-AO';

const line = (volts: number) => {
  const raw = Math.floor((volts * 1024) / 5);
  return `Raw: ${raw} Voltage: ${((raw * 5) / 1023).toFixed(2)} V`;
};
const PRINTS = printsFor(READS, line);
// Each line wraps to three rows; two readings.
const PANEL = { x: -254, y: 0, w: 240, h: 248 };
// Under the sensor, the gas rising onto its mesh head.
const NOZZLE = { x: 410, y: 306 };

const mq2GasAnalogReadUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mq2u', PANEL, { note: '115200', cableTo: USB.uno, wrap: true })}
      ${gasHtml('mq2u', NOZZLE)}`,
    bounds: [PANEL.x, PANEL.y, 460, NOZZLE.y + 38],
  },
  run(t, view) {
    const box = view.box('GAS1');
    runGas(view, 'mq2u', t, NOZZLE, { x: box.x + box.w - 44.6, y: box.y + box.h / 2 });
    view.glowWire(AO_WIRE, clamp((aoVolts(t) - CLEAN) / (GASSY - CLEAN)));
    showSerial(view, 'mq2u', t, PRINTS, { board: BOARD });
  },
};

export default mq2GasAnalogReadUno;
