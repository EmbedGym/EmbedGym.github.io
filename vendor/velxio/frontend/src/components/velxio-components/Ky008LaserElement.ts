/**
 * Ky008LaserElement.ts — KY-008 laser emitter module
 *
 * Velxio-native module (wokwi-elements has none). Pin names follow the
 * iot-skillsbench task JSON spelling (`signal`), which is what circuit wiring
 * and role resolution key off.
 *
 * The `laserOn` property is the whole state: true = signal HIGH, beam drawn.
 *
 * Artwork: top-down black KY board (Keyes / Joy-IT) with the 6 mm brass laser
 * head lying flat and overhanging the top edge, its green driver disc and
 * leads at the back, the SMD resistor and a right-angle header silkscreened
 * S / - whose pins run off the bottom edge. The real board is 15 × 18.5 mm;
 * the 16 px pin pitch is wider than 2.54 mm, so the board is drawn wider than
 * scale.
 *
 * Geometry (CSS px, canvas 64 × 60):
 *   Board: x 0–64, y 6–48.6.
 *   Laser head: x 23.5–40.5, y 0–26, pointing up; the beam extends past the top
 *   edge to y = -26 when on.
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

class Ky008LaserElement extends HTMLElement {
  readonly pinInfo = PIN_INFO;

  private _laserOn = false;

  static get observedAttributes() {
    return ['laseron'];
  }

  get laserOn() {
    return this._laserOn;
  }

  set laserOn(value: boolean) {
    const next = value === true || (value as unknown) === 'true';
    if (next === this._laserOn) return;
    this._laserOn = next;
    this.update();
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'laseron') this.laserOn = value !== null && value !== 'false';
  }

  private update() {
    const root = this.shadowRoot;
    if (!root) return;
    const beam = root.querySelector('#beam') as SVGGElement | null;
    if (beam) beam.setAttribute('visibility', this._laserOn ? 'visible' : 'hidden');
  }

  private render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        svg   { display: block; overflow: visible; }
      </style>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="ky008-holes">
            <rect y="-30" width="${W}" height="${H + 30}" fill="white"/>
            <g fill="black">
              <circle cx="8" cy="21" r="2.3"/><circle cx="56" cy="21" r="2.3"/>
              <circle cx="57.5" cy="11" r="1.2"/><circle cx="57.5" cy="32" r="1.2"/>
            </g>
          </mask>
        </defs>

        <g mask="url(#ky008-holes)">
          <rect x="0.4" y="6.4" width="63.2" height="42.2" rx="1.6"
                fill="#1b1b1b" stroke="#8c958a" stroke-width="0.8"/>
          <g fill="#c6c9cc">
            <circle cx="8" cy="21" r="3.9"/><circle cx="56" cy="21" r="3.9"/>
            <circle cx="57.5" cy="11" r="2.6"/><circle cx="57.5" cy="32" r="2.6"/>
          </g>
        </g>

        <g font-family="Arial, Helvetica, sans-serif" font-weight="bold" fill="#eeeae2">
          <text x="2.4" y="13.6" font-size="5.2">KY-008</text>
          <text x="4.6" y="46.6" font-size="7.5" text-anchor="middle">S</text>
          <text x="59.4" y="46.6" font-size="9" text-anchor="middle">-</text>
          <text x="3" y="35.6" font-size="4" font-weight="normal">R1</text>
        </g>

        <!-- SMD resistor with its silkscreen box. -->
        <rect x="11.6" y="29.6" width="13" height="7.2" fill="none" stroke="#eeeae2" stroke-width="0.5"/>
        <rect x="13.2" y="31" width="9.8" height="4.4" fill="#141414"/>
        <rect x="13.2" y="31" width="1.7" height="4.4" fill="#c6c9cc"/>
        <rect x="21.3" y="31" width="1.7" height="4.4" fill="#c6c9cc"/>
        <text x="18.1" y="34.4" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
              font-size="3" fill="#eeeae2">103</text>

        <!-- Laser leads from the driver disc down to their solder joints. -->
        <g stroke="#c6c9cc" stroke-width="1.1">
          <path d="M29 27V32.4M35 27V32.4"/>
        </g>
        <g fill="#c6c9cc" stroke="#9aa0a6" stroke-width="0.4">
          <circle cx="29" cy="32.4" r="1.9"/><circle cx="35" cy="32.4" r="1.9"/>
        </g>

        <!-- Brass laser head lying flat, lens end up, green driver disc behind. -->
        <rect x="24.8" y="25.4" width="14.4" height="2.8" rx="0.6" fill="#2f7d3a" stroke="#1d5426" stroke-width="0.4"/>
        <rect x="23.5" y="0" width="17" height="26" rx="0.8" fill="#cfa53a" stroke="#8a6a14" stroke-width="0.6"/>
        <rect x="26.4" y="0.3" width="3.4" height="25.4" fill="#ead07a"/>
        <rect x="36.6" y="0.3" width="3.6" height="25.4" fill="#b28b26"/>
        <rect x="23.8" y="10.2" width="16.4" height="1.3" fill="#8a6a14"/>
        <rect x="23.8" y="0.3" width="16.4" height="1.4" fill="#a98420"/>

        <g id="beam" visibility="hidden">
          <line x1="32" y1="0" x2="32" y2="-26" stroke="#ff2020" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="32" cy="0.4" r="2.6" fill="#ff2020"/>
        </g>

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
      </svg>
    `;
    this.update();
  }
}

if (!customElements.get('velxio-ky-008')) {
  customElements.define('velxio-ky-008', Ky008LaserElement);
}

export { Ky008LaserElement };
