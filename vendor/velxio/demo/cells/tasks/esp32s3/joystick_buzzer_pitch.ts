import type { Cell } from '../../cell';
import { setSound, sound } from '../../decor/sound';
import { DURATION, pushDir, ringPhaseFor, setKnob, squareWave, stickAt } from '../mega/joystick_buzzer_pitch';

// main.c: every 100 ms adc1_get_raw on GPIO 9 (12-bit, 0..4095), then
// ledc_set_freq(200 + y * 1800 / 4095) on GPIO 11 (integer maths).
const ADC_LABEL = 'GPIO 9 (VRy)';
const TONE_LABEL = 'tone GPIO 11';
const VRY_WIRE = 'w-9-VRy';
const TONE_WIRE = 'w-11-BZ1';

const polledY = (t: number) => Math.round((stickAt(Math.floor(t / 100) * 100) * 4095) / 1023);
const freqOf = (y: number) => 200 + Math.floor((y * 1800) / 4095);
const ringPhase = ringPhaseFor((t) => freqOf(polledY(t)));

// The stick is turned 270°, so VRy rises as it is pushed right. Push arrows above it,
// panel left of the parts, rings off the buzzer's free left side.
const PANEL = { x: -432, y: 120, w: 300, h: 132 };
const WAVE = { x: 16, y: 84, w: 268, h: 32 };
const RINGS = 3;
const ARROW = { x: -73, y: 176 };

const joystickBuzzerPitchEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-jpe-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-jpe-row { position: absolute; left: 16px; right: 16px; display: flex; justify-content: space-between;
          font-size: 24px; color: var(--ink); }
        .c-jpe-row b { font-family: var(--mono); }
        .c-jpe-y { color: #0066ff; }
        .c-jpe-hz { color: #00aa00; }
        .c-jpe-wave { fill: none; stroke: #00aa00; stroke-width: 2.5; stroke-linejoin: round; }
        .c-jpe-arrow { fill: none; stroke: var(--muted); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
        .c-jpe-arrow.on { stroke: var(--accent); }
      </style>
      <div class="c-jpe-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-jpe-row" style="top:10px"><span>${ADC_LABEL}</span><b class="c-jpe-y"></b></div>
        <div class="c-jpe-row" style="top:42px"><span>${TONE_LABEL}</span><b class="c-jpe-hz"></b></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <path class="c-jpe-wave" />
        </svg>
      </div>
      <svg class="cell-air" viewBox="0 0 10 10">
        <path class="c-jpe-arrow" data-dir="up" d="M ${ARROW.x + 7} ${ARROW.y} H ${ARROW.x + 31} M ${ARROW.x + 21} ${ARROW.y - 10} L ${ARROW.x + 31} ${ARROW.y} L ${ARROW.x + 21} ${ARROW.y + 10}" />
        <path class="c-jpe-arrow" data-dir="down" d="M ${ARROW.x - 7} ${ARROW.y} H ${ARROW.x - 31} M ${ARROW.x - 21} ${ARROW.y - 10} L ${ARROW.x - 31} ${ARROW.y} L ${ARROW.x - 21} ${ARROW.y + 10}" />
      </svg>
      ${sound('buze')}`,
    bounds: [PANEL.x, PANEL.y, ARROW.x + 31, ARROW.y + 10],
  },
  run(t, view) {
    setKnob(view, 'JOY1', stickAt(t) / 1023);
    const dir = pushDir(t);
    view.qa<SVGPathElement>('.c-jpe-arrow').forEach((a) => a.classList.toggle('on', a.dataset.dir === dir));

    const y = polledY(t);
    const hz = freqOf(y);
    view.glowWire(VRY_WIRE, 1);
    view.glowWire(TONE_WIRE, 1);
    view.q<HTMLElement>('.c-jpe-y').textContent = String(y);
    view.q<HTMLElement>('.c-jpe-hz').textContent = `${hz} Hz`;
    view.q<SVGPathElement>('.c-jpe-wave').setAttribute('d', squareWave(hz, WAVE));

    const buz = view.box('BZ1');
    setSound(view, 'buze', { x: buz.x + buz.w / 2 - 4, y: buz.y + buz.h / 2 }, RINGS * ringPhase(t), { dir: 'left', from: 50, to: 84, ongoing: true });
  },
};

export default joystickBuzzerPitchEsp32s3;
