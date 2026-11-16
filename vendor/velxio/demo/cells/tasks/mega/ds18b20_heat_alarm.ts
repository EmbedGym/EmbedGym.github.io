import { clamp, easeOutCubic, lerp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';

type Led = HTMLElement & { value: boolean };
type Buzzer = HTMLElement & { hasSignal: boolean };

// A lighter heats the probe past 30 °C and is taken away again. The sketch
// reads a new temperature each time a 750 ms conversion completes; above 30 °C
// it holds a 1 kHz tone and blinks the LED 500 ms on / 500 ms off, LED on first.
export const DURATION = 5000;
export const FLAME_ON = 400;
export const FLAME_OFF = 2600;
const COLD = 24;
const HOT = 36;
const THRESHOLD = 30;
export const CONVERSIONS = [0, 750, 1500, 2250, 3000, 3750, 4500];

function probeTemp(t: number) {
  if (t < FLAME_ON) return COLD;
  const warmed = lerp(COLD, HOT, easeOutCubic(clamp((t - FLAME_ON) / 1100)));
  if (t < FLAME_OFF) return warmed;
  return lerp(warmed, COLD, easeOutCubic(clamp((t - FLAME_OFF) / 1800)));
}

// The alarm starts or stops at the first completed conversion past the threshold.
// `conversions` are the times readings complete; a board whose firmware reads on another cadence passes its own.
const lastConversion = (t: number, conversions: number[]) => Math.max(...conversions.filter((c) => c <= t));
const alarmStart = (conversions: number[]) => conversions.find((c) => probeTemp(c) > THRESHOLD)!;
const alarmEnd = (conversions: number[]) => conversions.find((c) => c > alarmStart(conversions) && probeTemp(c) <= THRESHOLD)!;
const alarmOn = (t: number, conversions: number[]) =>
  lastConversion(t, conversions) >= alarmStart(conversions) && lastConversion(t, conversions) < alarmEnd(conversions);

export const PANEL = { x: -292, y: -156, w: 206, h: 112 };
const BAR = { x: 16, y: 48, w: 174, h: 16 };
const T_MIN = 20;
const T_MAX = 40;
const barX = (c: number) => BAR.x + (BAR.w * (c - T_MIN)) / (T_MAX - T_MIN);
const LIGHTER = { x: -64, y: -126 };

/** Shows what the sketch last read, so the panel agrees with the alarm. */
export function runProbePanel(view: CellView, t: number, conversions = CONVERSIONS) {
  const temp = probeTemp(lastConversion(t, conversions));
  const val = view.q<HTMLElement>('.c-ds-val');
  val.textContent = `${temp.toFixed(1)}°C`;
  val.classList.toggle('hot', temp > THRESHOLD);
  view.q<SVGRectElement>('.c-ds-fill').setAttribute('width', String(barX(temp) - BAR.x));
}

/** Drives L1 and BZ1 and glows the given wires while each is driven. */
export function runAlarm(view: CellView, t: number, wires: { led: string[]; buzzer: string[] }, conversions = CONVERSIONS) {
  const alarm = alarmOn(t, conversions);
  const ledOn = alarm && Math.floor((t - alarmStart(conversions)) / 500) % 2 === 0;
  view.part<Led>('L1').value = ledOn;
  view.part<Buzzer>('BZ1').hasSignal = alarm;
  if (ledOn) for (const id of wires.led) view.glowWire(id, 1);
  if (alarm) for (const id of wires.buzzer) view.glowWire(id, 1);
}

/** The probe reading panel at `p` (w 206, h 112); `runProbePanel` updates it. */
export function probePanel(p: { x: number; y: number }): string {
  return `
      <style>
        .c-ds-panel {
          position: absolute; left: ${p.x}px; top: ${p.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-ds-head { position: absolute; left: 16px; right: 16px; top: 8px; display: flex; justify-content: space-between;
          font-size: 24px; font-weight: 700; color: var(--ink); }
        .c-ds-val { font-family: var(--mono); }
        .c-ds-tick { font-family: var(--sans); font-size: 24px; fill: #d32f2f; }
        .c-ds-val.hot { color: #d32f2f; }
        .c-ds-track { fill: #f1f3f6; stroke: #e2e6ec; stroke-width: 1.5; }
        .c-ds-fill { fill: #f59e0b; }
        .c-ds-thr { stroke: #d32f2f; stroke-width: 3; }
      </style>
      <div class="c-ds-panel">
        <div class="c-ds-head"><span>probe</span><span class="c-ds-val"></span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <rect class="c-ds-track" x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="5" />
          <rect class="c-ds-fill" x="${BAR.x}" y="${BAR.y}" height="${BAR.h}" rx="5" />
          <line class="c-ds-thr" x1="${barX(THRESHOLD)}" x2="${barX(THRESHOLD)}" y1="${BAR.y - 7}" y2="${BAR.y + BAR.h + 7}" />
          <text class="c-ds-tick" x="${PANEL.w / 2}" y="${PANEL.h - 14}" text-anchor="middle">alarm &gt; 30 °C</text>
        </svg>
      </div>
`;
}

const ds18b20HeatAlarm: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${probePanel(PANEL)}
      <div style="position:absolute;left:${LIGHTER.x + 48}px;top:${LIGHTER.y}px">${lighter('ds', { kind: 'flame', scale: 0.55, flameScale: 1.4 })}</div>`,
    bounds: [PANEL.x, PANEL.y, LIGHTER.x + 90, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-4-data', 'w-4-RPU'], at: CONVERSIONS }],
  run(t, view) {
    const flameOn = t >= FLAME_ON && t < FLAME_OFF;
    setLighter(view, 'ds', t, flameOn);

    runProbePanel(view, t);
    runAlarm(view, t, { led: ['w-3-R1', 'w-R1-L1'], buzzer: ['w-2-BZ1'] });
  },
};

export default ds18b20HeatAlarm;
