import type { Cell, CellView } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { setSound, sound } from '../../decor/sound';

export const DURATION = 4000;
export const PRESSES: [number, number][] = [
  [500, 1400],
  [2300, 2800],
];
// The contacts bounce for 4.8 ms (the bounce-button model); the sketch acts once
// pin 2 has been steady for 50 ms, starting tone(13, 1000) after a press and
// noTone() after a release.
const SETTLE = 4.8;
const DEBOUNCE = 50;
export const LAG = SETTLE + DEBOUNCE;
export const TONES: [number, number][] = PRESSES.map(([down, up]) => [down + LAG, up + LAG]);
export const within = (ms: number, spans: [number, number][]) => {
  const m = ((ms % DURATION) + DURATION) % DURATION;
  return spans.some(([a, b]) => m >= a && m < b);
};

// A zoom on pin 2's first 70 ms after a press: the bounce, then the 50 ms the
// sketch waits before it starts the tone. Bounce widths are stretched so each
// spike reads at card size; the rest of the width is the rest of the 70 ms.
export const ZOOM = { x: -190, y: -138, w: 280, h: 128 };
const ZT = { x: 16, w: 248, hi: 50, lo: 76 };
const SPAN = 70;
const BOUNCE_EDGES = [0, 1.5, 3.0, 4.0, SETTLE];
const EDGE_X0 = ZT.x + 8;
const STEADY_X0 = EDGE_X0 + SETTLE * 6;
const STEADY_SCALE = (ZT.x + ZT.w - STEADY_X0) / (SPAN - SETTLE);
const TONE_X = STEADY_X0 + DEBOUNCE * STEADY_SCALE;
const zoomX = (ms: number) => (ms <= SETTLE ? EDGE_X0 + ms * 6 : STEADY_X0 + (ms - SETTLE) * STEADY_SCALE);

/** The press edge, or with `release` the release edge (HIGH bouncing down to LOW). */
function zoomPath(release = false) {
  const [from, to] = release ? [ZT.hi, ZT.lo] : [ZT.lo, ZT.hi];
  let d = `M ${ZT.x} ${from} H ${EDGE_X0}`;
  BOUNCE_EDGES.forEach((ms, i) => {
    d += ` H ${zoomX(ms)} V ${i % 2 === 0 ? to : from}`;
  });
  return `${d} H ${ZT.x + ZT.w}`;
}

/**
 * The zoom panel's markup at `zoom` (cell coordinates), classes prefixed `p`
 * (e.g. `c-bb`), titled with the button's pin. A narrow card at a low scale
 * sets the debounce label in `debFont` to fit a larger `font`. `size` scales
 * the whole panel, text included, for a card drawn at a very low scale. `doneLabel`
 * names what the sketch does once the 50 ms have passed.
 */
export function zoomHtml(p: string, pin: string, zoom: { x: number; y: number }, font = 20, debFont = 'var(--mono)', doneLabel = 'tone on', release = false, size = 1) {
  return `
      <style>
        .${p}-zoom {
          position: absolute; left: ${zoom.x}px; top: ${zoom.y}px; width: ${ZOOM.w * size}px; height: ${ZOOM.h * size}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .${p}-flat, .${p}-edge { fill: none; stroke: #00aa00; stroke-width: 3.5; stroke-linejoin: round; }
        .${p}-span { stroke: var(--accent); stroke-width: 2.5; fill: none; }
        .${p}-title { font-family: var(--sans); font-size: ${font}px; font-weight: 700; fill: var(--ink); }
        .${p}-deb { font-family: ${debFont}; font-size: ${font}px; fill: var(--accent); }
        .${p}-bounce { font-family: var(--mono); font-size: ${font}px; fill: var(--warn); }
        .${p}-tone { font-family: var(--mono); font-size: ${font}px; font-weight: 700; fill: #0066ff; }
      </style>
      <div class="${p}-zoom">
        <svg width="${ZOOM.w * size}" height="${ZOOM.h * size}"${size === 1 ? '' : ` viewBox="0 0 ${ZOOM.w} ${ZOOM.h}"`} style="position:absolute;left:0;top:0">
          <path class="${p}-flat" d="M ${ZT.x} ${ZT.lo} H ${ZT.x + ZT.w}" />
          <clipPath id="${p}-clip"><rect class="${p}-reveal" x="0" y="0" height="${ZOOM.h}" /></clipPath>
          <g class="${p}-shown" clip-path="url(#${p}-clip)">
            <path class="${p}-edge" d="${zoomPath()}" />${release ? `
            <path class="${p}-edge ${p}-redge" d="${zoomPath(true)}" />` : ''}
            <path class="${p}-span" d="M ${STEADY_X0 + 4} ${ZT.hi - 8} V ${ZT.hi - 14} H ${TONE_X} V ${ZT.hi - 8}" />
          </g>
          <g class="${p}-labels">
            <text class="${p}-bounce" x="${ZT.x}" y="${ZT.lo + 32}">bounce</text>
            <text class="${p}-title" x="${ZT.x}" y="28">${pin}</text>
            <text class="${p}-deb" x="${ZT.x + ZT.w}" y="28" text-anchor="end">50 ms debounce</text>
          </g>
          <g class="${p}-done">
            <line class="${p}-span" x1="${TONE_X}" x2="${TONE_X}" y1="${ZT.hi - 8}" y2="${ZT.lo + 6}" stroke-dasharray="4 4" />
            <text class="${p}-tone" x="${ZT.x + ZT.w}" y="${ZT.lo + 32}" text-anchor="end">${doneLabel}</text>
          </g>
        </svg>
      </div>`;
}

/**
 * The button's pin and the zoom at `t`, given whether the finger holds it down.
 * While the button is down the zoom sweeps the press edge in real time; the tone
 * starts once the input has been steady for 50 ms. The zoom stays up until the
 * release's debounce stops the tone. `pressedLabel` names a settled press
 * "pressed" instead of "bounce". `presses` are the finger's [down, up] times.
 * `release` (with a zoom drawn with `release`) also sweeps each release edge.
 * Returns whether the pin reads HIGH.
 */
export function runZoom(view: CellView, p: string, t: number, pressing: boolean, pressedLabel = false, presses = PRESSES, release = false): boolean {
  if (release) return runReleaseZoom(view, p, t, pressing, presses);
  const press = presses.find(([down, up]) => t >= down && t < up + LAG);
  const since = press ? t - press[0] : -1;
  const label = !press ? 'released' : pressedLabel && pressing && since >= SETTLE ? 'pressed' : 'bounce';
  view.q<SVGTextElement>(`.${p}-bounce`).textContent = label;
  const bouncedLow = BOUNCE_EDGES.some((ms, i) => i % 2 === 1 && since >= ms && since < BOUNCE_EDGES[i + 1]);
  view.q<SVGRectElement>(`.${p}-reveal`).setAttribute('width', String(press ? Math.min(zoomX(since), ZT.x + ZT.w) : 0));
  view.q<SVGElement>(`.${p}-shown`).style.opacity = press ? '1' : '0';
  view.q<SVGElement>(`.${p}-flat`).style.opacity = press ? '0' : '1';
  view.q<SVGElement>(`.${p}-done`).style.opacity = since >= LAG ? '1' : '0';
  return pressing && !bouncedLow;
}

// How long the release zoom stays up after the button lifts, so it can be read.
const RELEASE_HOLD = 600;

/**
 * runZoom for a zoom drawn with `release`: it sweeps the press edge while the
 * button is down, then the release edge (bounce, 50 ms wait, tone off) for
 * RELEASE_HOLD ms after it lifts.
 */
function runReleaseZoom(view: CellView, p: string, t: number, pressing: boolean, presses: [number, number][]): boolean {
  const press = presses.find(([down, up]) => t >= down && t < up);
  const lift = presses.find(([, up]) => t >= up && t < up + RELEASE_HOLD);
  const since = press ? t - press[0] : lift ? t - lift[1] : -1;
  const shown = Boolean(press || lift);
  const bouncing = since >= 0 && since < SETTLE;
  view.q<SVGTextElement>(`.${p}-bounce`).textContent = bouncing ? 'bounce' : press ? 'pressed' : 'released';
  view.q<SVGTextElement>(`.${p}-tone`).textContent = lift ? 'tone off' : 'tone on';
  view.q<SVGRectElement>(`.${p}-reveal`).setAttribute('width', String(shown ? Math.min(zoomX(since), ZT.x + ZT.w) : 0));
  view.q<SVGElement>(`.${p}-shown`).style.opacity = shown ? '1' : '0';
  view.q<SVGElement>(`.${p}-edge:not(.${p}-redge)`).style.opacity = press ? '1' : '0';
  view.q<SVGElement>(`.${p}-redge`).style.opacity = lift ? '1' : '0';
  view.q<SVGElement>(`.${p}-flat`).style.opacity = shown ? '0' : '1';
  view.q<SVGElement>(`.${p}-done`).style.opacity = since >= LAG ? '1' : '0';
  // In a bounce's odd phases the pin flicks back: LOW during a press, HIGH during a release.
  const flick = BOUNCE_EDGES.some((ms, i) => i % 2 === 1 && since >= ms && since < BOUNCE_EDGES[i + 1]);
  return lift ? flick : pressing && !flick;
}

export const toneAt = (t: number) => TONES.find(([a, b]) => t >= a && t < b);

const buzzerButton: Cell = {
  duration: DURATION,
  decor: {
    html: `${zoomHtml('c-bb', 'pin 2', ZOOM)}
      ${sound('buz')}
      ${finger('f')}`,
    bounds: [ZOOM.x, -200, ZOOM.x + ZOOM.w, ZOOM.y + ZOOM.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (runZoom(view, 'c-bb', t, pressing)) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }
    const sounding = within(t, TONES);
    if (sounding) view.glowWire('w-13-BUZ', 1);


    // Sound rings rise from the buzzer over the GND rail, one every 200 ms while it sounds.
    const buz = view.box('BUZ');
    const tone = toneAt(t);
    setSound(view, 'buz', { x: buz.x + buz.w / 2, y: buz.y + 38 }, tone ? (t - tone[0]) / 200 : null, { from: 66, to: 116 });
  },
};

export default buzzerButton;
