import { easeInOutCubic, lerp } from '../../anim';
import type { Cell, Rect } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { laser, setLaser } from '../../decor/laser';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';

type Tof = HTMLElement & { distance: number };

// A box sits 250 mm above the sensor, is pulled away to 1200 mm and comes back.
// The sketch reads the range over I2C once a second and prints it.
const DURATION = 5000;
const NEAR = 250;
const FAR = 1200;
const READS = [500, 1500, 2500, 3500, 4500];

function distance(t: number) {
  if (t < 1800) return NEAR;
  if (t < 2200) return lerp(NEAR, FAR, easeInOutCubic((t - 1800) / 400));
  if (t < 3800) return FAR;
  if (t < 4200) return lerp(FAR, NEAR, easeInOutCubic((t - 3800) / 400));
  return NEAR;
}
// "Distance: 1200 mm\r\n" takes ~20 ms at 9600 baud after the ~5 ms I2C read.
const PRINTS: Print[] = [-DURATION, 0].flatMap((base) =>
  READS.map((r) => ({ t: base + r + 25, text: `Distance: ${Math.round(distance(r))} mm` })),
);

const BOX = obstacleSize('box');
const gap = (d: number) => lerp(12, 70, (d - NEAR) / (FAR - NEAR));

/** What differs between boards: names, the serial panel and which way the sensor looks. */
export interface TofBoard {
  /** Class prefix, unique per board's card. */
  prefix: string;
  /** The I2C wires, which pulse at each read. */
  i2c: string[];
  /** The board element, for its TX LED; omitted where the board draws none. */
  txLed?: string;
  usb: UsbPort;
  panel: Rect;
  baud: string;
  /** Serial text size, px (default 25); the distance label is 1 px larger. */
  font?: number;
  /** Which way the sensor looks, as turned on the card. */
  facing: 'up' | 'down' | 'left' | 'right';
  /** The edge the sensor looks out of, cell coordinates. */
  face: number;
  /** The sensor's centre line across `face`, cell coordinates. */
  axis: number;
  /** The bounds' right edge, beyond the decor. */
  right: number;
}

export function tofCell(b: TofBoard): Cell {
  const tofP = b.prefix;
  const font = b.font ?? 25;
  const tofDist = `${tofP}dist`;
  const tofTurn = `${tofP}turn`;
  const side = b.facing === 'left' || b.facing === 'right';
  // +1 away from the board side the sensor looks to, along its axis.
  const out = b.facing === 'up' || b.facing === 'left' ? -1 : 1;
  const labelW = 7 * 0.6 * (font + 1);
  const labelH = font + 9;
  // The near edge of the box, cell coordinates, along the look direction.
  const near = (d: number) => b.face + out * gap(d);
  // Standing on end, the box is still BOX.h deep along the look direction.
  const far = near(FAR) + out * BOX.h;
  let bounds: [number, number, number, number];
  if (b.facing === 'up') bounds = [b.panel.x, far, b.right, b.panel.y + b.panel.h];
  else if (b.facing === 'down') bounds = [b.panel.x, b.panel.y, b.right, Math.max(far + 4 + labelH, b.panel.y + b.panel.h)];
  else if (b.facing === 'right')
    bounds = [b.panel.x, Math.min(b.panel.y, b.axis - BOX.w / 2), Math.max(b.right, far, near(FAR) + labelW), Math.max(b.panel.y + b.panel.h, b.axis + BOX.w / 2 + 4 + labelH)];
  else if (b.facing === 'left')
    bounds = [Math.min(b.panel.x, far, near(FAR) - labelW), Math.min(b.panel.y, b.axis - BOX.w / 2 - 4 - labelH), b.right, Math.max(b.panel.y + b.panel.h, b.axis + BOX.w / 2)];
  else throw new Error(`tofCell: unknown facing ${b.facing}`);
  // Turned sideways, the box stands on end: its wrapper turns a quarter, so the box's own x runs down the card.
  const box = side ? `<div class="${tofTurn}">${obstacle('box', 'box')}</div>` : obstacle('box', 'box');
  return {
    duration: DURATION,
    activity: [{ wires: b.i2c, at: READS }],
    decor: {
      html: `
        <style>
          .${tofDist} { position: absolute; left: 0; top: 0; font: 700 ${font + 1}px var(--mono); color: #0066ff; white-space: nowrap; }
          .${tofTurn} { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: rotate(90deg); }
        </style>
        ${serialPanel('out', b.panel, { note: b.baud, cableTo: b.usb, fontSize: font })}
        ${laser('beam')}${box}
        <div class="${tofDist}"></div>`,
      bounds,
    },
    run(t, view) {
      const d = distance(t);
      view.part<Tof>('TOF1').distance = Math.round(d);
      const label = view.q<HTMLElement>(`.${tofDist}`);
      label.textContent = `${Math.round(d)} mm`;
      const edge = near(d);
      // The laser pulse of each reading, drawn in the gap between the sensor and the box.
      const sinceRead = Math.min(...READS.map((r) => (t >= r ? t - r : Infinity)));
      const pulse = sinceRead < 200 ? 1 - sinceRead / 200 : 0;
      const from = b.face + out * 4;
      const to = edge - out * 2;
      if (b.facing === 'up') {
        placeObstacle(view, 'box', b.axis - BOX.w / 2, edge - BOX.h);
        label.style.transform = `translate(${b.axis + BOX.w / 2 + 14}px, ${edge - BOX.h / 2 - Math.floor(labelH / 2)}px)`;
        setLaser(view, 'beam', { x: b.axis, y: from }, { x: b.axis, y: to }, pulse, 0);
      } else if (b.facing === 'down') {
        placeObstacle(view, 'box', b.axis - BOX.w / 2, edge);
        label.style.transform = `translate(${b.axis - label.offsetWidth / 2}px, ${edge + BOX.h + 4}px)`;
        setLaser(view, 'beam', { x: b.axis, y: from }, { x: b.axis, y: to }, pulse, 0);
      } else {
        const top = b.axis - BOX.w / 2;
        const left = b.facing === 'right' ? edge : edge - BOX.h;
        placeObstacle(view, 'box', top, -left - BOX.h);
        label.style.transform =
          b.facing === 'right'
            ? `translate(${left}px, ${top + BOX.w + 4}px)`
            : `translate(${edge - label.offsetWidth}px, ${top - 4 - labelH}px)`;
        setLaser(view, 'beam', { x: from, y: b.axis }, { x: to, y: b.axis }, pulse, 0);
      }
      showSerial(view, 'out', t, PRINTS, { board: b.txLed });
    },
  };
}

// The box rides above the sensor's top edge.
export default tofCell({
  prefix: 'c-tof-',
  i2c: ['w-20-SDA', 'w-21-SCL'],
  txLed: 'arduino-mega',
  usb: USB.mega,
  panel: { x: -310, y: -52, w: 290, h: 114 },
  baud: '9600',
  font: 25,
  facing: 'up',
  face: 88 - 200,
  axis: 114 + 54 - 100,
  right: 260,
});
