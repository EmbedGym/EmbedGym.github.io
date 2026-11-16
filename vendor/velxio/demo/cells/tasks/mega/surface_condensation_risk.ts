import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

type Led = HTMLElement & { value: boolean };

// A window pane cools in a 22 °C, 50 % room, whose dew point is 11.1 °C.
// Every 2 s the sketch reads the air (DHT11) and the pane (IR thermometer) and
// rates the risk from how far the pane is above the dew point: LOW (LED off),
// MEDIUM within 3 °C (LED blinks at 1 Hz), HIGH at or below it (LED on).
// Below the dew point, droplets bead on the glass.
export const DURATION = 6000;
export const READS = [1000, 3000, 5000];
const DEW = 11.1;
const WARM = 20;

// Pane temperature over the loop: it cools past the dew point, then warms up.
const TEMPS: [number, number][] = [[0, WARM], [300, WARM], [900, 12.6], [1100, 12.6], [2800, 10], [3400, 10], [4700, WARM], [DURATION, WARM]];
function paneTemp(t: number) {
  const i = TEMPS.findIndex(([at]) => at > t);
  const [t0, v0] = TEMPS[i - 1];
  const [t1, v1] = TEMPS[i];
  return lerp(v0, v1, easeInOutCubic((t - t0) / (t1 - t0)));
}

type Risk = 'LOW' | 'MEDIUM' | 'HIGH';
function riskAt(read: number): Risk {
  const margin = paneTemp(read) - DEW;
  if (margin <= 0) return 'HIGH';
  return margin <= 3 ? 'MEDIUM' : 'LOW';
}
const lastRead = (t: number) => Math.max(...READS.filter((r) => r <= t), READS[READS.length - 1] - DURATION);
const risk = (t: number) => riskAt(lastRead(t) < 0 ? lastRead(t) + DURATION : lastRead(t));

const LOOP_PRINTS: Print[] = READS.map((r) => ({
  t: r + 30,
  text: `Air: 22.0 C RH: 50 Dew: ${DEW.toFixed(1)} C Surface: ${paneTemp(r).toFixed(1)} C Risk: ${riskAt(r)}`,
}));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -384, y: -90, w: 340, h: 191 };
const WINDOW = { x: 267, y: -96 };
// The IR thermometer's field of view, from its lens to the pane.
const BEAM = `362,-56 362,-44 ${WINDOW.x + 52},${WINDOW.y + 66} ${WINDOW.x + 52},${WINDOW.y + 6}`;

// Droplets on the pane: [x, y, radius].
const DROPS = [
  [16, 18, 4], [32, 34, 3], [22, 50, 5], [60, 16, 3.5], [70, 40, 4.5], [56, 58, 3],
  [14, 76, 3.5], [30, 92, 4.5], [64, 82, 5], [74, 96, 3], [44, 70, 3], [40, 22, 3],
];
export const windowSvg = (cls: string) => `
  <svg viewBox="0 0 90 114" width="52" height="66">
    <rect x="0" y="0" width="90" height="114" rx="4" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2" />
    <rect class="${cls}-glass" x="7" y="7" width="76" height="100" fill="#dbeafe" />
    ${DROPS.map(([x, y, r]) => `<circle class="${cls}-drop" cx="${x + 7}" cy="${y + 7}" r="${r}" fill="#ffffff" stroke="#60a5fa" stroke-width="1.4" />`).join('')}
    <path d="M 45 7 V 107 M 7 57 H 83" stroke="#9ca3af" stroke-width="4" />
  </svg>`;

export function showPane(view: CellView, cls: string, t: number) {
  // The glass turns from a pale to a cold blue as it cools.
  const cold = clamp((WARM - paneTemp(t)) / (WARM - 10));
  view.q<SVGRectElement>(`.${cls}-glass`).setAttribute('fill', `hsl(212, ${lerp(80, 90, cold)}%, ${lerp(92, 78, cold)}%)`);
  // Droplets bead one after another once the pane is below the dew point.
  const wet = clamp((DEW - paneTemp(t)) / (DEW - 10));
  view.qa<SVGCircleElement>(`.${cls}-drop`).forEach((drop, k) => {
    drop.style.opacity = String(clamp(wet * DROPS.length - k));
  });
}

export function ledOn(t: number) {
  const now = risk(t);
  return now === 'HIGH' || (now === 'MEDIUM' && Math.floor((t - lastRead(t)) / 500) % 2 === 0);
}

const surfaceCondensationRisk: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-sc-window { position: absolute; left: ${WINDOW.x}px; top: ${WINDOW.y}px; }
      </style>
      ${serialPanel('condensation', PANEL, { note: '115200', cableTo: USB.mega, wrap: true, fontSize: 27 })}
      <svg class="cell-air" viewBox="0 0 10 10">
        <defs>
          <linearGradient id="c-sc-beam" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0" stop-color="#f97316" stop-opacity="0.55" />
            <stop offset="1" stop-color="#f97316" stop-opacity="0.2" />
          </linearGradient>
        </defs>
        <polygon points="${BEAM}" fill="url(#c-sc-beam)" />
      </svg>
      <div class="c-sc-window">${windowSvg('c-sc')}</div>`,
    bounds: [PANEL.x, PANEL.y, WINDOW.x + 52, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-8-DATA', 'w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    showPane(view, 'c-sc', t);
    const on = ledOn(t);
    view.part<Led>('L1').value = on;
    if (on) {
      view.glowWire('w-12-R_LED', 1);
      view.glowWire('w-R_LED-L1', 1);
    }
    showSerial(view, 'condensation', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default surfaceCondensationRisk;
