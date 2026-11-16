import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { CLEAN, DURATION, GASSY, READS, aoVolts, detected, leakHtml, printsFor, runLeak } from '../mega/mq2_gas_leak_detector';

type Mq2 = HTMLElement & { detected: boolean };

// The Uno runs the Mega sketch unchanged: DO on pin 5, AO on A0 (10-bit, 5 V), 115200 baud.
const BOARD = 'arduino-uno';
const DO_WIRE = 'w-5-DO';
const AO_WIRE = 'w-A0-AO';

const PRINTS = printsFor(READS, (volts) => Math.floor((volts * 1024) / 5));
const PANEL = { x: -334, y: -10, w: 290, h: 180 };
// Left of the sensor, its gas drifting onto the mesh head.
const NOZZLE = { x: -240, y: 255 };

const mq2GasLeakDetectorUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mq2lu', PANEL, { note: '115200', cableTo: USB.uno, wrap: true })}
      ${leakHtml('mq2lu', NOZZLE)}`,
    bounds: [NOZZLE.x - 110, PANEL.y, PANEL.x + PANEL.w, NOZZLE.y + 17],
  },
  run(t, view) {
    const head = view.box('GAS1');
    runLeak(view, 'mq2lu', t, NOZZLE, { x: head.x + 44.6, y: NOZZLE.y });
    const gas = detected(t);
    view.part<Mq2>('GAS1').detected = gas;
    // DO is active LOW: its halo shows the alarm level.
    if (gas) view.glowWire(DO_WIRE, 1);
    view.glowWire(AO_WIRE, clamp((aoVolts(t) - CLEAN) / (GASSY - CLEAN)));
    showSerial(view, 'mq2lu', t, PRINTS, { board: BOARD });
  },
};

export default mq2GasLeakDetectorUno;
