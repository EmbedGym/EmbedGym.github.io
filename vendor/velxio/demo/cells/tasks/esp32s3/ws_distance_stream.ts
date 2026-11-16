import { easeInOutCubic, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { laser, setLaser } from '../../decor/laser';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';
import { chipWidth, runServer, server, serverSize, setServerLink, type ServerMessage } from '../../decor/server';

type Tof = HTMLElement & { distance: number };
type Led = HTMLElement & { value: boolean };

// The board reads the VL53L0X every 500 ms and sends the range to the WebSocket server; the server
// pushes thresholds, and the LED is on while the latest reading is below the latest threshold.
// Over the loop the box comes in from 817 to 403 mm (LED on), the server lowers the threshold to
// 334 (LED off), the box goes back and the server restores 623, the state the loop started in.
// Joining WiFi and the server happens once at boot, so the loop starts already linked.
const DURATION = 6000;
const READS = Array.from({ length: 12 }, (_, i) => i * 500);
const FLIGHT = 600;
const PUSHES = [
  { t: 2600, mm: 334 },
  { t: 5000, mm: 623 },
];
const NEAR = 403;
const FAR = 817;

function distance(t: number) {
  if (t < 1550) return FAR;
  if (t < 1950) return lerp(FAR, NEAR, easeInOutCubic((t - 1550) / 400));
  if (t < 4050) return NEAR;
  if (t < 4450) return lerp(NEAR, FAR, easeInOutCubic((t - 4050) / 400));
  return FAR;
}

function threshold(t: number) {
  const arrived = PUSHES.filter((p) => p.t + FLIGHT <= t);
  return arrived.length ? arrived[arrived.length - 1].mm : PUSHES[PUSHES.length - 1].mm;
}

// The LED changes at a read (the latest reading) or when a threshold arrives.
function ledOn(t: number) {
  const lastRead = Math.max(...READS.filter((r) => r <= t));
  return Math.round(distance(lastRead)) < threshold(t);
}

// Readings travel as their mm value. The previous loop's late chips are repeated at t - DURATION so
// the seam stays continuous.
const LOOP: ServerMessage[] = [
  ...READS.map((r) => ({ t: r + FLIGHT, text: `${Math.round(distance(r))}`, dir: 'to' as const })),
  ...PUSHES.map((p) => ({ t: p.t, text: `threshold ${p.mm}`, dir: 'from' as const })),
];
const MESSAGES: ServerMessage[] = [...LOOP.map((m) => ({ ...m, t: m.t - DURATION })), ...LOOP];

const FONT = 30;
const BOX = obstacleSize('box');
// The TOF looks right out of its edge at x 232, centre line y 148.2 (cell coordinates).
const FACE = 292 - 60;
const AXIS = 208.2 - 60;
const gap = (d: number) => lerp(12, 54, (d - NEAR) / (FAR - NEAR));
const LABEL_H = FONT + 9;
// The lane runs up from the server to the WiFi access point (W1, centre x 534, bottom 70). A
// vertical lane keeps a passing reading and threshold overlapping only briefly.
const REACH = 170;
const LABEL = 'WebSocket';
const SIZE = serverSize(LABEL, FONT);
const LANE_X = 534;
const SERVER = { x: LANE_X - SIZE.w / 2, y: 70 + REACH };
const WIDEST = chipWidth(`threshold ${Math.max(...PUSHES.map((p) => p.mm))}`.length, FONT);

const wsDistanceStreamEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-wsd-dist { position: absolute; left: 0; top: 0; font: 700 ${FONT}px var(--mono); color: #0066ff; white-space: nowrap; }
        .c-wsd-turn { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: rotate(90deg); }
      </style>
      ${laser('beam')}<div class="c-wsd-turn">${obstacle('box', 'box')}</div>
      <div class="c-wsd-dist"></div>
      ${server('ws', { ...SERVER, kind: 'web', label: LABEL, fontSize: FONT, side: 'top', reach: REACH })}`,
    bounds: [FACE, AXIS - BOX.w / 2, Math.max(SERVER.x + SIZE.w, LANE_X + WIDEST / 2), Math.max(AXIS + BOX.w / 2 + 4 + LABEL_H, SERVER.y + SIZE.h)],
  },
  activity: [{ wires: ['w-38-SDA', 'w-39-SCL'], at: READS }],
  run(t, view) {
    const d = distance(t);
    view.part<Tof>('TOF1').distance = Math.round(d);
    const left = FACE + gap(d);
    const top = AXIS - BOX.w / 2;
    // Turned sideways, the box stands on end: its wrapper turns a quarter, so the box's own x runs down the card.
    placeObstacle(view, 'box', top, -left - BOX.h);
    const label = view.q<HTMLElement>('.c-wsd-dist');
    label.textContent = `${Math.round(d)} mm`;
    label.style.transform = `translate(${left}px, ${top + BOX.w + 4}px)`;
    const sinceRead = Math.min(...READS.map((r) => (t >= r ? t - r : Infinity)));
    setLaser(view, 'beam', { x: FACE + 4, y: AXIS }, { x: left - 2, y: AXIS }, sinceRead < 200 ? 1 - sinceRead / 200 : 0, 0);

    setServerLink(view, 'ws', true);
    runServer(view, 'ws', t, MESSAGES);
    const lit = ledOn(t);
    view.part<Led>('L1').value = lit;
    ['w-10-R1', 'w-R1-L1'].forEach((id) => view.glowWire(id, lit ? 1 : 0));
  },
};

export default wsDistanceStreamEsp32s3;
