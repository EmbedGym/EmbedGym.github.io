import type { Cell } from '../../cell';
import { setSound, sound } from '../../decor/sound';
import { DURATION, freqOf, polledY, pushDir, ringPhaseFor, setKnob, squareWave, stickAt } from '../mega/joystick_buzzer_pitch';

// Same sketch as the Mega: every 100 ms read VRy on A0, tone(3, map(y, 0, 1023, 200, 2000)).
const ADC_LABEL = 'A0 (VRy)';
const TONE_LABEL = 'tone pin 3';
const VRY_WIRE = 'w-A0-VRy';
const TONE_WIRE = 'w-3-BZ1';

const ringPhase = ringPhaseFor((t) => freqOf(polledY(t)));

// Panel right of the board, above the buzzer; push arrows left of the joystick.
const PANEL = { x: 330, y: -4, w: 270, h: 132 };
const WAVE = { x: 16, y: 84, w: 238, h: 32 };
const RINGS = 3;
const ARROW = { x: 168, y: 236 };

const joystickBuzzerPitchUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-jpu-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-jpu-row { position: absolute; left: 16px; right: 16px; display: flex; justify-content: space-between;
          font-size: 24px; color: var(--ink); }
        .c-jpu-row b { font-family: var(--mono); }
        .c-jpu-y { color: #0066ff; }
        .c-jpu-hz { color: #00aa00; }
        .c-jpu-wave { fill: none; stroke: #00aa00; stroke-width: 2.5; stroke-linejoin: round; }
        .c-jpu-arrow { fill: none; stroke: var(--muted); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
        .c-jpu-arrow.on { stroke: var(--accent); }
      </style>
      <div class="c-jpu-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-jpu-row" style="top:10px"><span>${ADC_LABEL}</span><b class="c-jpu-y"></b></div>
        <div class="c-jpu-row" style="top:42px"><span>${TONE_LABEL}</span><b class="c-jpu-hz"></b></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <path class="c-jpu-wave" />
        </svg>
      </div>
      <svg class="cell-air" viewBox="0 0 10 10">
        <path class="c-jpu-arrow" data-dir="up" d="M ${ARROW.x} ${ARROW.y + 24} V ${ARROW.y} M ${ARROW.x - 10} ${ARROW.y + 10} L ${ARROW.x} ${ARROW.y} L ${ARROW.x + 10} ${ARROW.y + 10}" />
        <path class="c-jpu-arrow" data-dir="down" d="M ${ARROW.x} ${ARROW.y + 38} V ${ARROW.y + 62} M ${ARROW.x - 10} ${ARROW.y + 52} L ${ARROW.x} ${ARROW.y + 62} L ${ARROW.x + 10} ${ARROW.y + 52}" />
      </svg>
      ${sound('buzu')}`,
    bounds: [ARROW.x - 12, PANEL.y, PANEL.x + PANEL.w, ARROW.y + 62],
  },
  run(t, view) {
    setKnob(view, 'JOY1', stickAt(t) / 1023);
    const dir = pushDir(t);
    view.qa<SVGPathElement>('.c-jpu-arrow').forEach((a) => a.classList.toggle('on', a.dataset.dir === dir));

    const y = polledY(t);
    const hz = freqOf(y);
    view.glowWire(VRY_WIRE, 1);
    view.glowWire(TONE_WIRE, 1);
    view.q<HTMLElement>('.c-jpu-y').textContent = String(y);
    view.q<HTMLElement>('.c-jpu-hz').textContent = `${hz} Hz`;
    view.q<SVGPathElement>('.c-jpu-wave').setAttribute('d', squareWave(hz, WAVE));

    // Sound rings leave the buzzer's free right side, faster for a higher pitch.
    const buz = view.box('BZ1');
    setSound(view, 'buzu', { x: buz.x + buz.w / 2, y: buz.y + buz.h / 2 + 4 }, RINGS * ringPhase(t), { dir: 'right', from: 50, to: 84, ongoing: true });
  },
};

export default joystickBuzzerPitchUno;
