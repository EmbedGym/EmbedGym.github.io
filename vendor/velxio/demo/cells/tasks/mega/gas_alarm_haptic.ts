import { clamp, easeInOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { puffs, runPuffs } from '../../decor/puffs';
import { setVibration, vibration } from '../../decor/vibration';

type Haptic = HTMLElement & { vibrating: boolean };

// The loop starts from reset: the sketch's 10 s warm-up and 5 s baseline
// sampling are fast-forwarded into the first 0.85 s (baseline 205). A big puff
// lifts the MQ-2's analog reading past twice the baseline: ALARM START, LED on,
// buzz (effect 47), and again 2 s later. Then the module's DO threshold (its
// pot) is turned down and a small puff, still under 2x baseline, pulls DO LOW:
// the alarm starts again. The pot goes back up and the monitor clears for the
// next reset. The sketch prints the reading once a second after setup.
export const DURATION = 6000;
export const WARMUP = 150;
export const SAMPLING = 450;
export const SETUP_END = 850;
export const FADE_FROM = 5600;
export const BASELINE = 205;
const CLEAR = 206;
export const PUFFS = [
  { rise: 1000, fall: 3300, peak: 452 },
  { rise: 4100, fall: 5000, peak: 300 },
];
const PUFF_MS = 450;
export const DO_HIGH = 480;
export const DO_LOW = 250;
export const POT = [
  { at: 3600, to: DO_LOW },
  { at: 5300, to: DO_HIGH },
];
export const POT_MS = 400;

const ease = (t: number, at: number, ms: number) => easeInOutCubic(clamp((t - at) / ms));
// The reading before the ADC rounds it, so another board can scale it to its own ADC.
export const levelAt = (t: number) =>
  CLEAR + PUFFS.reduce((sum, p) => sum + (p.peak - CLEAR) * (ease(t, p.rise, PUFF_MS) - ease(t, p.fall, PUFF_MS)), 0);
const rawAt = (t: number) => Math.round(levelAt(t));
export function doTripAt(t: number) {
  let level = DO_HIGH;
  for (const turn of POT) level += (turn.to - level) * ease(t, turn.at, POT_MS);
  return level;
}
export const doLowAt = (t: number) => rawAt(t) >= doTripAt(t);
export const gasAt = (t: number) => (rawAt(t) - CLEAR) / (PUFFS[0].peak - CLEAR);

// The sketch's loop, sampled every 10 ms: alarm on DO LOW or raw >= 2x baseline, buzz every 2 s while on.
export const EVENTS: { t: number; text: string }[] = [];
export const BUZZES: number[] = [];
const ALARM_SPANS: [number, number][] = [];
{
  let on = false;
  let lastBuzz = 0;
  for (let t = SETUP_END; t < DURATION; t += 10) {
    const should = doLowAt(t) || rawAt(t) >= 2 * BASELINE;
    if (should && !on) {
      on = true;
      EVENTS.push({ t, text: 'ALARM START' });
      BUZZES.push(t);
      lastBuzz = t;
      ALARM_SPANS.push([t, DURATION]);
    } else if (!should && on) {
      on = false;
      EVENTS.push({ t, text: 'ALARM END' });
      ALARM_SPANS[ALARM_SPANS.length - 1][1] = t;
    }
    if (on && t - lastBuzz >= 2000) {
      BUZZES.push(t);
      lastBuzz = t;
    }
  }
  if (on) throw new Error('the loop must end with the alarm off');
}
export const BUZZ_MS = 100;
export const alarmAt = (t: number) => ALARM_SPANS.some(([a, b]) => t >= a && t < b);

export const READS = [1, 2, 3, 4].map((k) => SETUP_END + 1000 * k + 2);
const PRINTS: Print[] = [
  { t: WARMUP, text: 'Warming up' },
  { t: SAMPLING, text: 'Establishing baseline...' },
  { t: SETUP_END, text: `Baseline established: ${BASELINE}` },
  { t: SETUP_END + 1, text: 'Alarm system active' },
  ...READS.map((r) => ({
    t: r,
    text: `Raw: ${rawAt(r)} Baseline: ${BASELINE} State: ${alarmAt(r) ? 'ALARM' : 'clear'}`,
  })),
  ...EVENTS.map((e) => ({ t: e.t + 1, text: e.text })),
].sort((a, b) => a.t - b.t);

const SERIAL = { x: -532, y: USB.mega.y - 196, w: 482, h: 44 + 5 * 31 * 1.36 };
const PANEL = { x: -438, y: SERIAL.y + SERIAL.h + 8, w: 210, h: 156 };
const BAR = { x: 18, y: 88, w: 174, h: 26, max: 520 };
const barX = (raw: number) => BAR.x + (BAR.w * Math.min(raw, BAR.max)) / BAR.max;
// Gas drifts down onto the MQ-2's sensing dome through the space above it. The pot knob
// takes that space while it is turned, with a leader down to the module.
const KNOB = { x: -200, y: 132, w: 72, h: 76 };
const GAS_FROM = { x: -160, y: 140 };
const DOME = { x: -180, y: 250 };
const GAS1_TOP = 216;
const MOTOR = { dx: 51, dy: 9 };


const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-ga-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-ga-title { position: absolute; left: 18px; top: 8px; font-size: 31px; font-weight: 700; color: var(--ink); }
        .c-ga-val { position: absolute; right: 18px; top: 6px; font: 700 34px var(--mono); color: var(--ink); }
        .c-ga-val.alarm { color: var(--warn); }
        .c-ga-track { fill: #e3e8ee; }
        .c-ga-fill { fill: var(--accent); }
        .c-ga-fill.alarm { fill: var(--warn); }
        .c-ga-limit { stroke: var(--ink); stroke-width: 3; stroke-dasharray: 4 3; }
        .c-ga-mark { font: 700 31px var(--mono); fill: var(--ink); }
        /* The module's DO threshold, in the DO wire's colour. */
        .c-ga-do line { stroke: #aa00ff; stroke-width: 4; }
        .c-ga-do text { font: 700 31px var(--sans); fill: #aa00ff; }
        .c-ga-pot { position: absolute; left: ${KNOB.x}px; top: ${KNOB.y}px; overflow: visible; }
        .c-ga-pot circle { fill: #1e3a8a; stroke: #aa00ff; stroke-width: 3; }
        .c-ga-pot .c-ga-leader { stroke: #aa00ff; stroke-width: 3; stroke-dasharray: 5 4; stroke-linecap: butt; }
        .c-ga-pot line { stroke: #fff; stroke-width: 4; stroke-linecap: round; }
        .c-ga-pot text { font: 700 31px var(--sans); fill: #aa00ff; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega, wrap: true, fontSize: 31 })}
      <div class="c-ga-panel">
        <div class="c-ga-title"></div>
        <div class="c-ga-val"></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <rect class="c-ga-track" x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="6" />
          <rect class="c-ga-fill" x="${BAR.x}" y="${BAR.y}" height="${BAR.h}" rx="6" />
          <g class="c-ga-twice">
          <line class="c-ga-limit" x1="${barX(2 * BASELINE)}" x2="${barX(2 * BASELINE)}" y1="${BAR.y - 6}" y2="${BAR.y + BAR.h + 6}" />
          <text class="c-ga-mark" x="${barX(2 * BASELINE)}" y="${BAR.y + BAR.h + 34}" text-anchor="middle">2×${BASELINE}</text>
          </g>
          <g class="c-ga-do">
            <line y1="${BAR.y - 6}" y2="${BAR.y + BAR.h + 6}" />
            <text y="${BAR.y - 10}" text-anchor="middle">DO</text>
          </g>
        </svg>
      </div>
      ${puffs('big', 16)}${puffs('small', 7)}
      <svg class="c-ga-pot" width="${KNOB.w}" height="${KNOB.h}">
        <line class="c-ga-leader" x1="${KNOB.w / 2}" x2="${KNOB.w / 2}" y1="42" y2="${GAS1_TOP - KNOB.y - 4}" />
        <g transform="translate(${KNOB.w / 2} 20)"><circle r="18" /><line class="c-ga-knob" y1="-12" y2="12" /></g>
        <text x="${KNOB.w / 2 + 26}" y="31">pot</text>
      </svg>
      <div class="c-ga-motor" style="position:absolute">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, SERIAL.y, SERIAL.x + SERIAL.w, PANEL.y + PANEL.h],
  },
  // Each buzz writes the waveform, its terminator and GO.
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: BUZZES }],
  run(t, view) {
    const raw = rawAt(t);
    const alarm = alarmAt(t);
    const doLow = doLowAt(t);
    // The loop restarts the sketch: the readout crossfades back to the warm-up that t=0 shows.
    const reset = clamp((t - (DURATION - 300)) / 300);
    const restarted = reset >= 0.5;
    const resetOpacity = reset === 0 ? 1 : Math.abs(1 - 2 * reset);
    const title = view.q<HTMLElement>('.c-ga-title');
    title.textContent = t < SAMPLING || restarted ? 'warm-up ⏩' : t < SETUP_END ? 'sampling ⏩' : 'A5 raw';
    title.style.opacity = String(resetOpacity);
    view.q<SVGGElement>('.c-ga-twice').style.opacity = String(restarted ? 0 : clamp((t - SETUP_END) / 200) * resetOpacity);
    const val = view.q<HTMLElement>('.c-ga-val');
    val.textContent = t < SETUP_END || restarted ? '' : String(raw);
    val.style.opacity = String(resetOpacity);
    val.classList.toggle('alarm', alarm);
    const fill = view.q<SVGRectElement>('.c-ga-fill');
    fill.setAttribute('width', String(barX(raw) - BAR.x));
    fill.classList.toggle('alarm', alarm);
    const trip = view.q<SVGGElement>('.c-ga-do');
    trip.setAttribute('transform', `translate(${barX(doTripAt(t))} 0)`);
    trip.querySelector('text')!.textContent = doLow ? 'DO LOW' : 'DO';

    const turning = POT.some((p) => t > p.at - 150 && t < p.at + POT_MS + 150);
    const pot = view.q<SVGSVGElement>('.c-ga-pot');
    pot.style.opacity = turning ? '1' : '0';
    // The knob's 270° travel spans DO_LOW..DO_HIGH; turning it down is counter-clockwise.
    pot.querySelector('.c-ga-knob')!.setAttribute('transform', `rotate(${(270 * (doTripAt(t) - DO_LOW)) / (DO_HIGH - DO_LOW)})`);
    // Each puff of the story is a stream over its rise..fall, thinner for the smaller one.
    PUFFS.forEach((p, k) =>
      runPuffs(view, k === 0 ? 'big' : 'small', t, {
        from: GAS_FROM,
        to: DOME,
        window: [p.rise - 400, p.fall],
        flight: 1200,
        size: [6, 24],
        spread: 30,
        opacity: turning ? 0 : 0.6 * ((p.peak - CLEAR) / (PUFFS[0].peak - CLEAR)) ** 0.5,
        seed: k + 1,
      }),
    );
    view.glowWire('w-A5-AO', clamp(gasAt(t)));
    if (doLow) view.glowWire('w-5-DO', 1);

    view.part<HTMLElement & { value: boolean }>('L1').value = alarm;
    if (alarm) {
      view.glowWire('w-12-resistor', 1);
      view.glowWire('w-resistor-LED', 1);
    }

    const buzzing = BUZZES.some((b) => t >= b && t < b + BUZZ_MS);
    const lastBuzz = [...BUZZES].reverse().find((b) => b <= t);
    // The arcs linger 300 ms after the 100 ms buzz so it reads at card size.
    const trail = lastBuzz === undefined ? 0 : 1 - clamp((t - lastBuzz - BUZZ_MS) / 300);
    view.part<Haptic>('HAP1').vibrating = buzzing;
    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-ga-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', trail);

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: FADE_FROM });
  },
};

export default cell;
