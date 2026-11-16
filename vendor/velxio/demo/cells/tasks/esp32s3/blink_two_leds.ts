import type { Cell } from '../../cell';
import { isOn, TRACE, tracePath } from '../mega/blink_two_leds';

type Led = HTMLElement & { value: boolean };

// Each LED toggles on its own interval, both starting off.
const CHANNELS = [
  { led: 'L1', wires: ['w-10-R1', 'w-R1-L1'], label: 'GPIO 10', rate: '1 Hz', half: 500, color: '#ff8800', top: 44 },
  { led: 'L2', wires: ['w-11-R2', 'w-R2-L2'], label: 'GPIO 11', rate: '2 Hz', half: 250, color: '#0066ff', top: 108 },
];

// A two-channel logic trace, left of the LEDs.
const SCOPE = { x: -432, y: 172, w: 280, h: 146 };

const blinkTwoLedsEsp32s3: Cell = {
  duration: 4000,
  decor: {
    html: `
      <style>
        .c-b2e-scope {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-b2e-label { font-family: var(--mono); font-size: 20px; fill: var(--ink); }
        .c-b2e-rate { font-family: var(--mono); font-size: 20px; fill: var(--muted); }
        .c-b2e-trace { fill: none; stroke-width: 4; stroke-linejoin: round; }
      </style>
      <div class="c-b2e-scope" style="left:${SCOPE.x}px;top:${SCOPE.y}px;width:${SCOPE.w}px;height:${SCOPE.h}px">
        <svg width="${SCOPE.w}" height="${SCOPE.h}" style="position:absolute;left:0;top:0">
          ${CHANNELS.map(
            (c, i) => `
              <text class="c-b2e-label" x="${TRACE.x}" y="${c.top - 10}">${c.label}</text>
              <text class="c-b2e-rate" x="${TRACE.x + TRACE.w}" y="${c.top - 10}" text-anchor="end">${c.rate}</text>
              <path class="c-b2e-trace" data-ch="${i}" stroke="${c.color}" />
              <circle class="c-b2e-dot" data-ch="${i}" r="6" cx="${TRACE.x + TRACE.w}" fill="${c.color}" />`,
          ).join('')}
        </svg>
      </div>`,
    bounds: [SCOPE.x, SCOPE.y, SCOPE.x + SCOPE.w, SCOPE.y + SCOPE.h],
  },
  run(t, view) {
    CHANNELS.forEach((c, i) => {
      const on = isOn(t, c.half);
      view.part<Led>(c.led).value = on;
      if (on) c.wires.forEach((w) => view.glowWire(w, 1));
      view.q<SVGPathElement>(`.c-b2e-trace[data-ch="${i}"]`).setAttribute('d', tracePath(t, c.half, c.top));
      view.q<SVGCircleElement>(`.c-b2e-dot[data-ch="${i}"]`).setAttribute('cy', String(c.top + (on ? 0 : TRACE.swing)));
    });
  },
};

export default blinkTwoLedsEsp32s3;
