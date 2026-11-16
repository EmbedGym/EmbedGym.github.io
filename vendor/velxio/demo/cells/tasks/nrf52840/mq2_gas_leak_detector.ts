import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { CLEAN, DURATION, GASSY, aoVolts, detected, leakHtml, printsFor, runLeak } from '../mega/mq2_gas_leak_detector';

type Mq2 = HTMLElement & { detected: boolean };

// Zephyr: DO reaches P1.10 through LS1, AO reaches P0.03 (AIN1) as 0.6 × AO
// through the 100k/150k divider; a 12-bit SAADC read at gain 1/6 against the
// 0.6 V reference (3.6 V full scale), a report every 1000 ms from boot.
const AO_WIRES = ['w2', 'w3', 'w4'];
const DO_WIRES = ['w6', 'w7'];
const READS = [0, 1000, 2000, 3000, 4000, 5000];

const PRINTS = printsFor(READS, (volts) => Math.round(((0.6 * volts) / 3.6) * 4096));
// Each report wraps to two rows; one reading and the alarm line.
const FONT = 34;
const PANEL = { x: -372, y: 30, w: 332, h: 34 + 3 * FONT * 1.36 + 10 };
// Right of the sensor, its nozzle at the mesh head (GAS1 is turned 180°, so the head is at its right end).
const NOZZLE = { x: 395, y: 357 };

const mq2GasLeakDetectorNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mq2ln', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: FONT })}
      ${leakHtml('mq2ln', NOZZLE, true)}`,
    bounds: [PANEL.x, PANEL.y, NOZZLE.x + 110, NOZZLE.y + 17],
  },
  run(t, view) {
    const head = view.box('GAS1');
    runLeak(view, 'mq2ln', t, NOZZLE, { x: head.x + head.w - 44.6, y: head.y + head.h / 2 });
    const gas = detected(t);
    view.part<Mq2>('GAS1').detected = gas;
    // DO is active LOW: its halo shows the alarm level.
    if (gas) for (const id of DO_WIRES) view.glowWire(id, 1);
    const level = clamp((aoVolts(t) - CLEAN) / (GASSY - CLEAN));
    for (const id of AO_WIRES) view.glowWire(id, level);
    showSerial(view, 'mq2ln', t, PRINTS);
  },
};

export default mq2GasLeakDetectorNrf52840;
