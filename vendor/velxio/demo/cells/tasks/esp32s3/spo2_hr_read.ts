import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRINTS, READS, heartScale, tracePath } from '../mega/spo2_hr_read';

const BOARD = 'esp32-s3';
const BUS = ['w-38-SDA', 'w-39-SCL'];

// Under the console socket: two readings of 48 px text, one row each.
const PANEL = { x: -60, y: 376, w: 660, h: 186 };
// The pulse scope right of the board, under the sensor and finger.
const SCOPE = { x: 168, y: -20, w: 300, h: 160 };
// The sensor window on the module turned 180°, relative to its box.
const WINDOW_AT = { dx: 56, dy: 29 };
const TRACE = { x: 80, w: 200, top: 40, swing: 92 };

const spo2HrReadEsp: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-oxe-scope {
          position: absolute; box-sizing: border-box; border-radius: 12px; background: #f8fafc; border: 1.5px solid #cfd6df;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-oxe-trace { fill: none; stroke: #dc2626; stroke-width: 5; stroke-linejoin: round; }
        .c-oxe-heart { position: absolute; left: 12px; top: 46px; font: 50px/1 var(--sans); color: #dc2626; transform-origin: 50% 60%; }
      </style>
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 48 })}
      <div class="c-oxe-scope" style="left:${SCOPE.x}px;top:${SCOPE.y}px;width:${SCOPE.w}px;height:${SCOPE.h}px">
        <div class="c-oxe-heart">♥</div>
        <svg width="${SCOPE.w}" height="${SCOPE.h}" style="position:absolute;left:0;top:0"><path class="c-oxe-trace" /></svg>
      </div>
      ${finger('f', { rotate: 90, scale: 1.5 })}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    // The finger lies flat from the right, its pad on the sensor window.
    const box = view.box('BIO1');
    pressFinger(view, 'f', t, { x: box.x + WINDOW_AT.dx, y: box.y + WINDOW_AT.dy }, [[-1, Infinity]]);
    view.q<SVGPathElement>('.c-oxe-trace').setAttribute('d', tracePath(t, TRACE));
    view.q<HTMLElement>('.c-oxe-heart').style.transform = `scale(${heartScale(t)})`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default spo2HrReadEsp;
