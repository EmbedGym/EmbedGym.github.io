import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { FLAME_OFF, FLAME_ON, ROOM, WARM, sensorTemp } from '../mega/tmp36_read';

// ESP-IDF: 12-bit reading of GPIO9 scaled to 3.3 V, printed at 115200 baud, then a 500 ms delay.
const VOUT_WIRE = 'w-9-Vout';
const PERIOD = 500;
const DURATION = PERIOD * 10;

function printed(c: number) {
  const reading = Math.round(((c / 100 + 0.5) * 4095) / 3.3);
  return (((reading * 3.3) / 4095 - 0.5) * 100).toFixed(2);
}

const LOOP_PRINTS: Print[] = Array.from({ length: 10 }, (_, k) => {
  const read = 30 + k * PERIOD;
  return { t: read + 2, text: `Temperature: ${printed(sensorTemp(read))} C` };
});
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

// The board is tall, so the card's scale is low: the panel is wide and its text large.
const PANEL = { x: -200, y: 372, w: 474, h: 96 };
const NOZZLE = { x: -134, y: 24 };

const tmp36ReadEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('t36e', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 36 })}
      <div style="position:absolute;left:${NOZZLE.x}px;top:${NOZZLE.y}px">${lighter('t36e', { kind: 'flame', scale: 0.55, flameScale: 0.9 })}</div>`,
    bounds: [Math.min(PANEL.x, NOZZLE.x - 66), NOZZLE.y - 20, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    setLighter(view, 't36e', t, t >= FLAME_ON && t < FLAME_OFF);
    // Vout rises 10 mV per °C; the wire glows brighter as the sensor warms.
    view.glowWire(VOUT_WIRE, clamp((sensorTemp(t) - ROOM) / (WARM - ROOM)));
    showSerial(view, 't36e', t, PRINTS);
  },
};

export default tmp36ReadEsp32s3;
