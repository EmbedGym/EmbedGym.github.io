import { clamp, easeOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { setTurn, turn } from '../../decor/turn';

type Encoder = HTMLElement & { angle: number };

// The knob turns three detents clockwise and three back. On each rising CLK edge
// the sketch reads DT and prints the new position and direction.
const DURATION = 3400;
const CW = [400, 800, 1200];
const CCW = [2000, 2400, 2800];
const STEP_DEG = 18;
const TURN_MS = 120;

const STEPS = [...CW.map((at) => ({ at, dir: 1 })), ...CCW.map((at) => ({ at, dir: -1 }))];
// "Position: 3 Direction: CCW\r\n" takes ~2.4 ms at 115200 baud.
const PRINTS: Print[] = STEPS.map((s, i) => {
  const pos = STEPS.slice(0, i + 1).reduce((a, x) => a + x.dir, 0);
  return { t: s.at + 3, text: `Position: ${pos} Direction: ${s.dir > 0 ? 'CW' : 'CCW'}` };
});

const PANEL = { x: -320, y: USB.mega.y - 150, w: 300, h: 181 };
// A turning arrow sits right of the encoder, inside the 5V wire's drop.
const ARROW_DX = 82;

function knobAngle(t: number) {
  return STEPS.reduce((a, s) => a + s.dir * STEP_DEG * easeOutCubic(clamp((t - s.at) / TURN_MS)), 0);
}

const rotaryEncoder: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      ${turn('knob')}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    view.part<Encoder>('ENC1').angle = (knobAngle(t) + 360) % 360;

    const sinceStep = Math.min(...STEPS.map((s) => (t >= s.at ? t - s.at : Infinity)));
    const last = [...STEPS].reverse().find((s) => s.at <= t) ?? STEPS[STEPS.length - 1];
    // CLK and DT each pulse low then high on a detent; DT leads CLK when turning clockwise.
    const lead = last.dir > 0 ? 'w-3-DT' : 'w-2-CLK';
    const lag = last.dir > 0 ? 'w-2-CLK' : 'w-3-DT';
    if (sinceStep < 50) view.glowWire(lead, 1);
    if (sinceStep > 15 && sinceStep < 65) view.glowWire(lag, 1);

    // The arrow points the way of the latest turn and fades between turns.
    const enc = view.box('ENC1');
    const nearest = Math.min(...STEPS.map((s) => Math.abs(t - s.at - TURN_MS / 2)));
    setTurn(view, 'knob', { x: enc.x + enc.w + ARROW_DX - 50, y: enc.y + 36 }, last.dir > 0 ? 1 : -1, clamp(1 - (nearest - 150) / 250));

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: DURATION - 300 });
  },
};

export default rotaryEncoder;
