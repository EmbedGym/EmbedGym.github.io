import type { Cell } from '../../cell';
import { isOn, TRACE, tracePath } from '../mega/blink_led_1hz';

type Led = HTMLElement & { value: boolean };

const PIN_LABEL = 'P1.15';
const SIGNAL_WIRES = ['w-P1.15-R1', 'w-R1-L1'];

// A logic-analyser strip of P1.15, left of the LED above the board.
const SCOPE = { x: -221, y: -100, w: 210, h: 112 };

const blinkLed1hzNrf52840: Cell = {
  duration: 4000,
  decor: {
    html: `
      <style>
        .c-b1n-scope {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-b1n-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-b1n-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-b1n-grid { stroke: #e8ebf0; stroke-width: 1.5; }
        .c-b1n-trace { fill: none; stroke: #00aa00; stroke-width: 4; stroke-linejoin: round; }
        .c-b1n-dot { fill: #00aa00; }
      </style>
      <div class="c-b1n-scope" style="left:${SCOPE.x}px;top:${SCOPE.y}px;width:${SCOPE.w}px;height:${SCOPE.h}px">
        <div class="c-b1n-head"><span>${PIN_LABEL}</span><span>1 Hz</span></div>
        <svg width="${SCOPE.w}" height="${SCOPE.h}" style="position:absolute;left:0;top:0">
          <line class="c-b1n-grid" x1="${TRACE.x}" x2="${TRACE.x + TRACE.w}" y1="${TRACE.hi}" y2="${TRACE.hi}" />
          <line class="c-b1n-grid" x1="${TRACE.x}" x2="${TRACE.x + TRACE.w}" y1="${TRACE.lo}" y2="${TRACE.lo}" />
          <path class="c-b1n-trace" />
          <circle class="c-b1n-dot" r="6" cx="${TRACE.x + TRACE.w}" />
        </svg>
      </div>`,
    bounds: [SCOPE.x, SCOPE.y, SCOPE.x + SCOPE.w, SCOPE.y + SCOPE.h],
  },
  run(t, view) {
    const on = isOn(t);
    view.part<Led>('L1').value = on;
    if (on) for (const id of SIGNAL_WIRES) view.glowWire(id, 1);
    view.q<SVGPathElement>('.c-b1n-trace').setAttribute('d', tracePath(t));
    view.q<SVGCircleElement>('.c-b1n-dot').setAttribute('cy', String(on ? TRACE.hi : TRACE.lo));
  },
};

export default blinkLed1hzNrf52840;
