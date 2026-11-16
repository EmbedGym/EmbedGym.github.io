/**
 * ShockSensorElement.ts — KY-002 style shock/vibration sensor module
 *
 * Velxio-native module (wokwi-elements has none). Pin names follow the
 * iot-skillsbench task JSON spelling (`signal`), which is what circuit wiring
 * and role resolution key off. Click the element (or use the sensor panel /
 * harness `set <role>.shock = true`) to fire a momentary HIGH pulse.
 *
 * Artwork: top-down black KY board (Keyes / Joy-IT) with the black spring
 * vibration switch standing upright (its open end shows the copper spring
 * contact), the 10k SMD resistor and a right-angle header silkscreened S / -
 * whose pins run off the bottom edge. The real board is 15 × 18.5 mm; the
 * 16 px pin pitch is wider than 2.54 mm, so the board is drawn wider than
 * scale.
 *
 * Geometry (CSS px, canvas 64 × 60):
 *   Board: x 0–64, y 0–48.6.
 *   Vibration switch: circle centred on (32, 16.4).
 *   Header: three pins at x = 16 / 32 / 48 whose tips end at the bottom edge.
 */

const W = 64;
const H = 60;
const PIN_Y = 60;

const PIN_INFO = [
  { name: 'signal', x: 16, y: PIN_Y, number: 1, signals: [] as Array<unknown> },
  { name: 'VCC', x: 32, y: PIN_Y, number: 2, signals: [{ type: 'power', signal: 'VCC' }] },
  { name: 'GND', x: 48, y: PIN_Y, number: 3, signals: [{ type: 'power', signal: 'GND' }] },
];

class ShockSensorElement extends HTMLElement {
  readonly pinInfo = PIN_INFO;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; cursor: pointer; }
        svg   { display: block; overflow: visible; }
      </style>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="ky002-holes">
            <rect width="${W}" height="${H}" fill="white"/>
            <g fill="black">
              <circle cx="7.5" cy="19" r="2.3"/><circle cx="56.5" cy="19" r="2.3"/>
              <circle cx="57.5" cy="6" r="1.2"/><circle cx="6.5" cy="31.5" r="1.2"/>
            </g>
          </mask>
        </defs>

        <g mask="url(#ky002-holes)">
          <rect x="0.4" y="0.4" width="63.2" height="48.2" rx="1.6"
                fill="#1b1b1b" stroke="#8c958a" stroke-width="0.8"/>
          <g fill="#c6c9cc">
            <circle cx="7.5" cy="19" r="3.9"/><circle cx="56.5" cy="19" r="3.9"/>
            <circle cx="57.5" cy="6" r="2.6"/><circle cx="6.5" cy="31.5" r="2.6"/>
          </g>
        </g>

        <g font-family="Arial, Helvetica, sans-serif" font-weight="bold" fill="#eeeae2">
          <text x="2.4" y="8.6" font-size="5.2">KY-002</text>
          <text x="4.6" y="46.6" font-size="7.5" text-anchor="middle">S</text>
          <text x="59.4" y="46.6" font-size="9" text-anchor="middle">-</text>
          <text x="26.4" y="35.6" font-size="4" font-weight="normal">R1</text>
          <text x="45" y="27.6" font-size="4" font-weight="normal">S1</text>
        </g>

        <!-- 10k SMD resistor with its silkscreen box. -->
        <rect x="11.6" y="29.6" width="13" height="7.2" fill="none" stroke="#eeeae2" stroke-width="0.5"/>
        <rect x="13.2" y="31" width="9.8" height="4.4" fill="#141414"/>
        <rect x="13.2" y="31" width="1.7" height="4.4" fill="#c6c9cc"/>
        <rect x="21.3" y="31" width="1.7" height="4.4" fill="#c6c9cc"/>
        <text x="18.1" y="34.4" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
              font-size="3" fill="#eeeae2">103</text>

        <!-- Spring vibration switch standing upright, seen from above. -->
        <circle cx="32" cy="16.4" r="10.6" fill="#0f0f0f" stroke="#4a4a4a" stroke-width="0.8"/>
        <circle cx="32" cy="16.4" r="7.6" fill="#242424"/>
        <circle cx="32" cy="16.4" r="4" fill="#090909"/>
        <circle cx="32" cy="16.4" r="2.6" fill="none" stroke="#c8803c" stroke-width="1.3"/>
        <circle cx="32" cy="16.4" r="0.9" fill="#c8803c"/>

        <!-- Right-angle header: housings on the board, pins off the edge. -->
        <rect x="8.4" y="37.6" width="47.2" height="11" fill="none" stroke="#eeeae2" stroke-width="0.5"/>
        <g fill="#232323" stroke="#050505" stroke-width="0.5">
          <rect x="10.2" y="39" width="11.6" height="9.6" rx="0.8"/>
          <rect x="26.2" y="39" width="11.6" height="9.6" rx="0.8"/>
          <rect x="42.2" y="39" width="11.6" height="9.6" rx="0.8"/>
        </g>
        <g fill="#d4a017" stroke="#9a7412" stroke-width="0.4">
          <rect x="14.6" y="41.6" width="2.8" height="18.4" rx="1"/>
          <rect x="30.6" y="41.6" width="2.8" height="18.4" rx="1"/>
          <rect x="46.6" y="41.6" width="2.8" height="18.4" rx="1"/>
        </g>
      </svg>`;
  }
}

if (!customElements.get('velxio-shock-sensor')) {
  customElements.define('velxio-shock-sensor', ShockSensorElement);
}

export { ShockSensorElement };
