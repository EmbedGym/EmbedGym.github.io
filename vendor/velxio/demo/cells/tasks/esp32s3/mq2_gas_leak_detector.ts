import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { CLEAN, DURATION, GASSY, aoVolts, detected, leakHtml, printsFor, runLeak } from '../mega/mq2_gas_leak_detector';

type Mq2 = HTMLElement & { detected: boolean };

// ESP-IDF: DO reaches GPIO5 through LS1, AO reaches GPIO4 as 0.6 × AO through
// the 100k/150k divider; a 12-bit raw read at 11 dB every 1000 ms from boot.
const AO_WIRES = ['w2', 'w3', 'w4'];
const DO_WIRES = ['w6', 'w7'];
const READS = [0, 1000, 2000, 3000, 4000, 5000];

const PRINTS = printsFor(READS, (volts) => Math.round(((0.6 * volts) / 3.3) * 4095));
// Right of the board, so the circuit fills the card; the cable runs under the board to the downward socket.
const FONT = 28;
const PANEL = { x: 160, y: 100, w: 350, h: 34 + 3 * FONT * 1.36 + 10 };
const CABLE_BOTTOM = USB.esp32s3.y + 12 + 20;
// Under the sensor, its nozzle below the mesh head.
const NOZZLE = { x: -234, y: 222 };

const mq2GasLeakDetectorEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mq2le', PANEL, { note: '115200', cableTo: USB.esp32s3, wrap: true, fontSize: FONT })}
      ${leakHtml('mq2le', NOZZLE)}`,
    bounds: [NOZZLE.x - 110, PANEL.y, PANEL.x + PANEL.w, CABLE_BOTTOM + 4],
  },
  run(t, view) {
    const head = view.box('GAS1');
    runLeak(view, 'mq2le', t, NOZZLE, { x: head.x + 44.6, y: head.y + head.h / 2 });
    const gas = detected(t);
    view.part<Mq2>('GAS1').detected = gas;
    // DO is active LOW: its halo shows the alarm level.
    if (gas) for (const id of DO_WIRES) view.glowWire(id, 1);
    const level = clamp((aoVolts(t) - CLEAN) / (GASSY - CLEAN));
    for (const id of AO_WIRES) view.glowWire(id, level);
    showSerial(view, 'mq2le', t, PRINTS);
  },
};

export default mq2GasLeakDetectorEsp32s3;
