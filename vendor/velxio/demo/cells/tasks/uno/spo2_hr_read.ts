import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRINTS, READS, WINDOW_AT, heartScale, tracePath } from '../mega/spo2_hr_read';

const BOARD = 'arduino-uno';
const BUS = ['w-A4-SDA', 'w-A5-SCL'];

// Four rows of 34 px text: two readings, each wrapping once.
const PANEL = { x: -304, y: -30, w: 280, h: 238 };
// The pulse scope under the board, left of the sensor.
const SCOPE = { x: 88, y: 292, w: 196, h: 104 };
const TRACE = { x: 50, w: 134, top: 30, swing: 56 };

const spo2HrReadUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-oxu-scope {
          position: absolute; box-sizing: border-box; border-radius: 12px; background: #f8fafc; border: 1.5px solid #cfd6df;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-oxu-trace { fill: none; stroke: #dc2626; stroke-width: 3.5; stroke-linejoin: round; }
        .c-oxu-heart { position: absolute; left: 8px; top: 28px; font: 32px/1 var(--sans); color: #dc2626; transform-origin: 50% 60%; }
      </style>
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, wrap: true, fontSize: 34 })}
      <div class="c-oxu-scope" style="left:${SCOPE.x}px;top:${SCOPE.y}px;width:${SCOPE.w}px;height:${SCOPE.h}px">
        <div class="c-oxu-heart">♥</div>
        <svg width="${SCOPE.w}" height="${SCOPE.h}" style="position:absolute;left:0;top:0"><path class="c-oxu-trace" /></svg>
      </div>
      ${finger('f', { rotate: 90 })}`,
    bounds: [PANEL.x, PANEL.y, SCOPE.x + SCOPE.w, SCOPE.y + SCOPE.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    // The finger lies flat from the right, its pad on the sensor window.
    const box = view.box('BIO1');
    pressFinger(view, 'f', t, { x: box.x + WINDOW_AT.dx, y: box.y + WINDOW_AT.dy }, [[-1, Infinity]]);
    view.q<SVGPathElement>('.c-oxu-trace').setAttribute('d', tracePath(t, TRACE));
    view.q<HTMLElement>('.c-oxu-heart').style.transform = `scale(${heartScale(t)})`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default spo2HrReadUno;
