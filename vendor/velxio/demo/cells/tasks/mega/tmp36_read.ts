import { clamp, easeOutCubic, lerp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A lighter warms the TMP36 and is taken away. The sketch reads A0, converts
// it with (V - 0.5) * 100, prints at 9600 baud and waits 500 ms, so a line
// goes out about every 523 ms.
export const PERIOD = 523;
export const DURATION = PERIOD * 10;
export const FLAME_ON = 700;
export const FLAME_OFF = 2900;
export const ROOM = 24;
export const WARM = 34;

export function sensorTemp(t: number) {
  const warmed = t < FLAME_ON ? ROOM : lerp(ROOM, WARM, easeOutCubic(clamp((t - FLAME_ON) / 1300)));
  if (t < FLAME_OFF) return warmed;
  return lerp(warmed, ROOM, easeOutCubic(clamp((t - FLAME_OFF) / 1900)));
}

// What the sketch prints: the 10-bit reading of the sensor's voltage, converted back.
function printed(c: number) {
  const reading = Math.round(((c / 100 + 0.5) * 1023) / 5);
  return (((reading * 5) / 1023 - 0.5) * 100).toFixed(2);
}

const LOOP_PRINTS: Print[] = Array.from({ length: 10 }, (_, k) => {
  const read = 30 + k * PERIOD;
  return { t: read + 23, text: `Temperature: ${printed(sensorTemp(read))} C` };
});
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -356, y: USB.mega.y - 56, w: 336, h: 112 };
// The lighter stays outside the VCC wire that wraps round the sensor; its heat
// shows as shimmer between the wire and the sensor.
const LIGHTER = { x: 292, y: 297 };
const HEAT_X = [250, 262, 274];
const HEAT_Y = 272;

/** Heat shimmer: wavy marks at `xs` rising from 40 px below `y`; `runHeat` animates them. */
export function heatHtml(xs: number[], y: number): string {
  return `
      <style>
        .c-t36-heat { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-linecap: round; }
      </style>
      <svg class="cell-air" viewBox="0 0 10 10">
        ${xs.map((x) => `<path class="c-t36-heat" d="M ${x} ${y + 40} q -4 -5 0 -10 q 4 -5 0 -10 q -4 -5 0 -10 q 4 -5 0 -10" />`).join('')}
      </svg>`;
}

/** Shows the shimmer while the flame burns. */
export function runHeat(view: CellView, t: number) {
  const flameOn = t >= FLAME_ON && t < FLAME_OFF;
  const heat = flameOn ? clamp((t - FLAME_ON) / 300) : 0;
  view.qa<SVGPathElement>('.c-t36-heat').forEach((mark, k) => {
    const rise = ((t / 12 + k * 7) % 20) - 10;
    mark.setAttribute('transform', `translate(0 ${-rise})`);
    mark.style.opacity = String(heat * (0.55 + 0.45 * Math.sin(t / 90 + k * 2.1)));
  });
}

const tmp36Read: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('tmp36', PANEL, { note: '9600', cableTo: USB.mega })}
      ${heatHtml(HEAT_X, HEAT_Y)}
      <div style="position:absolute;left:${LIGHTER.x + 18}px;top:${LIGHTER.y}px">${lighter('t36', { kind: 'flame', mirror: true, scale: 0.55, flameScale: 0.7 })}</div>`,
    bounds: [PANEL.x, PANEL.y, LIGHTER.x + 79, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const flameOn = t >= FLAME_ON && t < FLAME_OFF;
    setLighter(view, 't36', t, flameOn);
    runHeat(view, t);
    // Vout rises 10 mV per °C; the wire glows brighter as the sensor warms.
    view.glowWire('w-A0-Vout', clamp((sensorTemp(t) - ROOM) / (WARM - ROOM)));
    showSerial(view, 'tmp36', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default tmp36Read;
