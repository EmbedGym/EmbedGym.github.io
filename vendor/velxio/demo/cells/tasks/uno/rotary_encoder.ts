import { clamp, easeOutCubic } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { setTurn, turn } from '../../decor/turn';

type Encoder = HTMLElement & { angle: number };

// Board-specific names.
const BOARD = 'arduino-uno';
const CLK_WIRE = 'w-2-CLK';
const DT_WIRE = 'w-3-DT';

// The knob turns three detents clockwise and three back. On each CLK edge the
// firmware reads DT and prints the new position and direction. The esp32s3 and
// nrf52840 cards print the same line and share this story.
export const DURATION = 3400;
const CW = [400, 800, 1200];
const CCW = [2000, 2400, 2800];
const STEP_DEG = 18;
const TURN_MS = 120;

const STEPS = [...CW.map((at) => ({ at, dir: 1 as const })), ...CCW.map((at) => ({ at, dir: -1 as const }))];
// Each detent is drawn as a full quadrature cycle: the leading pin (CLK when
// clockwise, DT when counter-clockwise) is low from 0 to 250 ms, the other from
// 80 to 330 ms. The real cycle takes a few ms; it is stretched to be seen.
const LEAD_LOW = [0, 250];
const LAG_LOW = [80, 330];

/**
 * The firmware's prints for a CLK edge: the AVR and ESP32-S3 read DT on CLK's
 * rising edge, the nRF on its falling edge. "Position: 3 Direction: CCW\r\n"
 * takes ~2.4 ms at 115200 baud.
 */
export function encoderPrints(edge: 'rise' | 'fall'): Print[] {
  const at = edge === 'rise' ? 1 : 0;
  return STEPS.map((s, i) => {
    const pos = STEPS.slice(0, i + 1).reduce((a, x) => a + x.dir, 0);
    const clkEdge = (s.dir > 0 ? LEAD_LOW : LAG_LOW)[at];
    return { t: s.at + clkEdge + 3, text: `Position: ${pos} Direction: ${s.dir > 0 ? 'CW' : 'CCW'}` };
  });
}

function knobAngle(t: number) {
  return STEPS.reduce((a, s) => a + s.dir * STEP_DEG * easeOutCubic(clamp((t - s.at) / TURN_MS)), 0);
}

/**
 * Turns the knob, pulses CLK and DT on each detent, and shows the turning
 * arrow `arrowKey` at `arrowAt` (cell coordinates), fading between turns.
 */
export function runEncoder(t: number, view: CellView, wires: { clk: string; dt: string }, arrowKey: string, arrowAt: { x: number; y: number }, arrowScale = 1) {
  view.part<Encoder>('ENC1').angle = (knobAngle(t) + 360) % 360;

  const sinceStep = Math.min(...STEPS.map((s) => (t >= s.at ? t - s.at : Infinity)));
  const last = [...STEPS].reverse().find((s) => s.at <= t) ?? STEPS[STEPS.length - 1];
  const lead = last.dir > 0 ? wires.clk : wires.dt;
  const lag = last.dir > 0 ? wires.dt : wires.clk;
  if (sinceStep >= LEAD_LOW[0] && sinceStep < LEAD_LOW[1]) view.glowWire(lead, 1);
  if (sinceStep > LAG_LOW[0] && sinceStep < LAG_LOW[1]) view.glowWire(lag, 1);

  // The arrow points the way of the nearest turn and fades between turns.
  const near = STEPS.reduce((a, s) => (Math.abs(t - s.at - TURN_MS / 2) < Math.abs(t - a.at - TURN_MS / 2) ? s : a));
  setTurn(view, arrowKey, arrowAt, near.dir, clamp(1 - (Math.abs(t - near.at - TURN_MS / 2) - 150) / 250), arrowScale);
}

// The card's scale is ~0.7, so the text is drawn larger.
const FONT = 27;
const PANEL = { x: -320, y: USB.uno.y - 150, w: 300, h: 195 };
const ARROW_DX = 34;
// The encoder's right edge, from layout.mjs, plus the arrow's reach.
const ARROW_RIGHT = 416 + ARROW_DX + 30;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.uno, wrap: true, fontSize: FONT })}
      ${turn('knob')}`,
    bounds: [PANEL.x, PANEL.y, ARROW_RIGHT, PANEL.y + PANEL.h],
  },
  run(t, view) {
    // The encoder is turned 180°, knob outward: the arrow sits right of it.
    const enc = view.box('ENC1');
    runEncoder(t, view, { clk: CLK_WIRE, dt: DT_WIRE }, 'knob', { x: enc.x + enc.w + ARROW_DX, y: enc.y + 36 });
    showSerial(view, 'out', t, encoderPrints('rise'), { board: BOARD, fadeFrom: DURATION - 300 });
  },
};

export default cell;
