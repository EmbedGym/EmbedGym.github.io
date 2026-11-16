import type { Cell, CellView } from '../../cell';
import { FACE, FACE_EDGE, MUTED, TEXT } from '../../decor/common';
import { airLane, runAir, FLIGHT, type Packet } from './ble_uart_console';

type Lcd = HTMLElement & { text: string };

// Two BTHome thermometers advertise their temperature every second; the board
// scans for them and shows each on its LCD row. A sensor that has been silent
// for 10 s shows -- again. Here Kitchen keeps advertising 19.7 C; Garden powers
// on, is heard at -0.4 C, goes silent, and its row falls back to -- once its
// 10 s are up, which is how the loop starts. The whole loop runs fast: a
// second takes SECOND ms, adverts and silence alike.

const LCD_WIRES = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];
const KITCHEN = '19.7';
const GARDEN = '-0.4';

const SECOND = 400;
const DURATION = 15 * SECOND;
const KITCHEN_ADVERTS = Array.from({ length: 15 }, (_, k) => k * SECOND);
const GARDEN_ADVERTS = [1, 2, 3].map((k) => k * SECOND);
const GARDEN_ON_AT = GARDEN_ADVERTS[0];
const GARDEN_HEARD_AT = GARDEN_ADVERTS[0] + FLIGHT;
const LAST_HEARD_AT = GARDEN_ADVERTS[2] + FLIGHT;
const GARDEN_OFF_AT = LAST_HEARD_AT + 50;
const STALE_AT = LAST_HEARD_AT + 10 * SECOND;

const lcdText = (kitchen: string, garden: string) => `Kitchen ${kitchen} C`.padEnd(16) + `Garden ${garden} C`.padEnd(16);

// Cell coordinates: a row under the board, clear of the bottom-header wires: Kitchen, the radio (B1), Garden.
const FONT = 34;
const TAG_W = 260;
const TAG_H = 112;
const B1 = { x: 65, y: 324, w: 88, h: 70 };
const ROW_Y = B1.y + B1.h / 2 - TAG_H / 2;
const KITCHEN_TAG = { x: B1.x - 70 - TAG_W, y: ROW_Y };
const GARDEN_TAG = { x: B1.x + B1.w + 70, y: ROW_Y };
const LANE_Y = B1.y + B1.h / 2;

function tag(key: string, at: { x: number; y: number }, name: string): string {
  return `
    <div data-tag="${key}" style="position:absolute;left:${at.x}px;top:${at.y}px;width:${TAG_W}px;height:${TAG_H}px;box-sizing:border-box;
      border:2px solid ${FACE_EDGE};border-radius:16px;background:${FACE};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
      <div style="font:600 ${FONT}px/1.2 var(--sans);color:${MUTED}">${name}</div>
      <div data-tag-reading style="font:700 ${FONT}px/1.2 var(--mono);white-space:nowrap"></div>
    </div>`;
}

function setTag(view: CellView, key: string, reading: string, on: boolean) {
  const el = view.q<HTMLElement>(`[data-tag="${key}"] [data-tag-reading]`);
  el.textContent = reading;
  el.style.color = on ? TEXT : MUTED;
}

const PACKETS_KITCHEN: Packet[] = KITCHEN_ADVERTS.map((t) => ({ t, dir: 'up', adv: true }));
// Garden's lane runs from B1 (x0) to Garden (x1), so its adverts travel 'down'.
const PACKETS_GARDEN: Packet[] = GARDEN_ADVERTS.map((t) => ({ t, dir: 'down', adv: true }));

const bleScanDisplay: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${tag('kitchen', KITCHEN_TAG, 'Kitchen')}
      ${tag('garden', GARDEN_TAG, 'Garden')}
      ${airLane('kitchen-air', { x0: KITCHEN_TAG.x + TAG_W, x1: B1.x, y: LANE_Y })}
      ${airLane('garden-air', { x0: B1.x + B1.w, x1: GARDEN_TAG.x, y: LANE_Y })}`,
    bounds: [KITCHEN_TAG.x, ROW_Y, GARDEN_TAG.x + TAG_W, ROW_Y + TAG_H],
  },
  // Each row is rewritten only when its text changes; the burst is stretched to be seen.
  activity: [{ wires: LCD_WIRES, at: [GARDEN_HEARD_AT, GARDEN_HEARD_AT + 60, STALE_AT, STALE_AT + 60] }],
  run(t, view) {
    setTag(view, 'kitchen', `${KITCHEN}°C`, true);
    const gardenOn = t >= GARDEN_ON_AT && t < GARDEN_OFF_AT;
    const silent = t < GARDEN_ON_AT ? 10 : Math.min(10, Math.floor((t - LAST_HEARD_AT) / SECOND));
    setTag(view, 'garden', gardenOn ? `${GARDEN}°C` : `silent ${Math.max(0, silent)} s`, gardenOn);
    runAir(view, 'kitchen-air', t, PACKETS_KITCHEN);
    runAir(view, 'garden-air', t, PACKETS_GARDEN);
    const gardenFresh = t >= GARDEN_HEARD_AT && t < STALE_AT;
    view.part<Lcd>('LCD1').text = lcdText(KITCHEN, gardenFresh ? GARDEN : '--');
  },
};

export default bleScanDisplay;
