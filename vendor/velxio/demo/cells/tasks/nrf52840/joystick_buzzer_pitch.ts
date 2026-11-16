import type { Cell } from '../../cell';
import { setSound, sound } from '../../decor/sound';
import { DURATION, pushDir, ringPhaseFor, setKnob, squareWave, stickAt } from '../mega/joystick_buzzer_pitch';

// main.c: every 100 ms read P0.04 (AIN2) in mV (the stick runs from VDD, so 0..3300 mV), then
// PWM at 200 + 1800 * mv / 3300 Hz on P1.15 (integer maths). VRx on P0.03 is wired but unused.
const ADC_LABEL = 'P0.04 (VRy)';
const TONE_LABEL = 'tone P1.15';
const VRY_WIRE = 'w-P0.04-VRy';
const TONE_WIRE = 'w-P1.15-BZ1';

const polledY = (t: number) => Math.round((stickAt(Math.floor(t / 100) * 100) * 3300) / 1023);
const freqOf = (mv: number) => 200 + Math.floor((1800 * mv) / 3300);
const ringPhase = ringPhaseFor((t) => freqOf(polledY(t)));

// The stick is turned 270°, so VRy rises as it is pushed right. Push arrows left of it,
// rings off the buzzer's free bottom side, panel left of the buzzer.
const PANEL = { x: -400, y: 6, w: 310, h: 140 };
const WAVE = { x: 16, y: 92, w: 278, h: 32 };
const RINGS = 3;
const ARROW = { x: 12, y: 295 };

const joystickBuzzerPitchNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-jpn-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-jpn-row { position: absolute; left: 16px; right: 16px; display: flex; justify-content: space-between;
          font-size: 26px; color: var(--ink); }
        .c-jpn-row b { font-family: var(--mono); }
        .c-jpn-y { color: #0066ff; }
        .c-jpn-hz { color: #00aa00; }
        .c-jpn-wave { fill: none; stroke: #00aa00; stroke-width: 2.5; stroke-linejoin: round; }
        .c-jpn-arrow { fill: none; stroke: var(--muted); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
        .c-jpn-arrow.on { stroke: var(--accent); }
      </style>
      <div class="c-jpn-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-jpn-row" style="top:10px"><span>${ADC_LABEL}</span><b class="c-jpn-y"></b></div>
        <div class="c-jpn-row" style="top:46px"><span>${TONE_LABEL}</span><b class="c-jpn-hz"></b></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <path class="c-jpn-wave" />
        </svg>
      </div>
      <svg class="cell-air" viewBox="0 0 10 10">
        <path class="c-jpn-arrow" data-dir="up" d="M ${ARROW.x + 7} ${ARROW.y} H ${ARROW.x + 31} M ${ARROW.x + 21} ${ARROW.y - 10} L ${ARROW.x + 31} ${ARROW.y} L ${ARROW.x + 21} ${ARROW.y + 10}" />
        <path class="c-jpn-arrow" data-dir="down" d="M ${ARROW.x - 7} ${ARROW.y} H ${ARROW.x - 31} M ${ARROW.x - 21} ${ARROW.y - 10} L ${ARROW.x - 31} ${ARROW.y} L ${ARROW.x - 21} ${ARROW.y + 10}" />
      </svg>
      ${sound('buzn')}`,
    bounds: [PANEL.x, PANEL.y, ARROW.x + 31, ARROW.y + 10],
  },
  run(t, view) {
    setKnob(view, 'JOY1', stickAt(t) / 1023);
    const dir = pushDir(t);
    view.qa<SVGPathElement>('.c-jpn-arrow').forEach((a) => a.classList.toggle('on', a.dataset.dir === dir));

    const y = polledY(t);
    const hz = freqOf(y);
    view.glowWire(VRY_WIRE, 1);
    view.glowWire(TONE_WIRE, 1);
    view.q<HTMLElement>('.c-jpn-y').textContent = `${y} mV`;
    view.q<HTMLElement>('.c-jpn-hz').textContent = `${hz} Hz`;
    view.q<SVGPathElement>('.c-jpn-wave').setAttribute('d', squareWave(hz, WAVE));

    const buz = view.box('BZ1');
    setSound(view, 'buzn', { x: buz.x + buz.w / 2, y: buz.y + buz.h / 2 + 4 }, RINGS * ringPhase(t), { dir: 'down', from: 50, to: 84, ongoing: true });
  },
};

export default joystickBuzzerPitchNrf52840;
