import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRINTS, READS, heartScale, tracePath } from '../mega/spo2_hr_read';

const BOARD = 'nrf52840-dk';
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];

// Left of the DK at its console socket: two readings, each wrapping once.
const PANEL = { x: -310, y: 10, w: 280, h: 238 };
// The pulse scope above the board, right of the finger.
const SCOPE = { x: 180, y: -180, w: 280, h: 150 };
// The sensor window on the module turned 90°, relative to its box.
const WINDOW_AT = { dx: 29, dy: 64 };
const TRACE = { x: 80, w: 180, top: 40, swing: 92 };

const spo2HrReadNrf: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-oxn-scope {
          position: absolute; box-sizing: border-box; border-radius: 12px; background: #f8fafc; border: 1.5px solid #cfd6df;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-oxn-trace { fill: none; stroke: #dc2626; stroke-width: 5; stroke-linejoin: round; }
        .c-oxn-heart { position: absolute; left: 12px; top: 46px; font: 50px/1 var(--sans); color: #dc2626; transform-origin: 50% 60%; }
      </style>
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: 34 })}
      <div class="c-oxn-scope" style="left:${SCOPE.x}px;top:${SCOPE.y}px;width:${SCOPE.w}px;height:${SCOPE.h}px">
        <div class="c-oxn-heart">♥</div>
        <svg width="${SCOPE.w}" height="${SCOPE.h}" style="position:absolute;left:0;top:0"><path class="c-oxn-trace" /></svg>
      </div>
      ${finger('f', { rotate: 90, scale: 1.5 })}`,
    bounds: [PANEL.x, SCOPE.y, SCOPE.x + SCOPE.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    // The finger lies flat from the right, its pad on the sensor window.
    const box = view.box('BIO1');
    pressFinger(view, 'f', t, { x: box.x + WINDOW_AT.dx, y: box.y + WINDOW_AT.dy }, [[-1, Infinity]]);
    view.q<SVGPathElement>('.c-oxn-trace').setAttribute('d', tracePath(t, TRACE));
    view.q<HTMLElement>('.c-oxn-heart').style.transform = `scale(${heartScale(t)})`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default spo2HrReadNrf;
