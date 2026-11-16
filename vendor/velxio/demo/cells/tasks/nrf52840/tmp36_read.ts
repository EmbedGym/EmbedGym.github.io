import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { FLAME_OFF, FLAME_ON, ROOM, WARM, sensorTemp } from '../mega/tmp36_read';

// Zephyr: 12-bit SAADC on P0.03 (gain 1/6, 0.6 V reference, so 3.6 V full scale),
// converted to whole millivolts, printed at 115200 baud, then a 500 ms sleep.
const VOUT_WIRE = 'w-P0.03-Vout';
const PERIOD = 500;
const DURATION = PERIOD * 10;

function printed(c: number) {
  const raw = Math.round(((c / 100 + 0.5) * 4096) / 3.6);
  const mv = Math.floor((raw * 3600) / 4096);
  return ((mv - 500) / 10).toFixed(2);
}

const LOOP_PRINTS: Print[] = Array.from({ length: 10 }, (_, k) => {
  const read = 30 + k * PERIOD;
  return { t: read + 2, text: `Temperature: ${printed(sensorTemp(read))} C` };
});
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

const PANEL = { x: -314, y: 60, w: 300, h: 108 };
// Right of the sensor, its flame licking the sensor's flat face.
const NOZZLE = { x: 314, y: 288 };

const tmp36ReadNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('t36n', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: 23 })}
      <div style="position:absolute;left:${NOZZLE.x}px;top:${NOZZLE.y}px">${lighter('t36n', { kind: 'flame', mirror: true, scale: 0.55, flameScale: 0.9 })}</div>`,
    bounds: [PANEL.x, PANEL.y, NOZZLE.x + 66, NOZZLE.y + 20],
  },
  run(t, view) {
    setLighter(view, 't36n', t, t >= FLAME_ON && t < FLAME_OFF);
    // Vout rises 10 mV per °C; the wire glows brighter as the sensor warms.
    view.glowWire(VOUT_WIRE, clamp((sensorTemp(t) - ROOM) / (WARM - ROOM)));
    showSerial(view, 't36n', t, PRINTS);
  },
};

export default tmp36ReadNrf52840;
