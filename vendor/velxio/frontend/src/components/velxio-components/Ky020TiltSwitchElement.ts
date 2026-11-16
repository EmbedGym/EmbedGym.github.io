/**
 * Ky020TiltSwitchElement.ts — KY-020 tilt switch module
 *
 * wokwi-elements ships a bare `wokwi-tilt-switch` (GND/VCC/OUT), but the
 * iot-skillsbench KY-020 is a 3-pin breakout whose pins are named
 * S / V / G — those are the names circuit wiring and role resolution key off.
 *
 * The `tilted` property is the whole state: true = ball settled across the
 * contacts (switch closed, S driven HIGH), false = upright (S LOW).
 *
 * Artwork: top-down black KY board (Keyes / Joy-IT) with the blue ball tilt
 * switch lying diagonally, the 10k SMD resistor and a right-angle header
 * silkscreened S / - whose pins run off the bottom edge. The real board is
 * 15 × 18.5 mm; the 16 px pin pitch is wider than 2.54 mm, so the board is
 * drawn wider than scale.
 *
 * Geometry (CSS px, canvas 64 × 60):
 *   Board: x 0–64, y 0–48.6.
 *   Tilt switch: centred on (32, 17); rotates 20° when tilted so the state is
 *   visible.
 *   Header: three pins at x = 16 / 32 / 48 whose tips end at the bottom edge.
 */

const W = 64;
const H = 60;
const PIN_Y = 60;

const PIN_INFO = [
  { name: 'S', x: 16, y: PIN_Y, number: 1, signals: [] as Array<unknown> },
  { name: 'V', x: 32, y: PIN_Y, number: 2, signals: [{ type: 'power', signal: 'VCC' }] },
  { name: 'G', x: 48, y: PIN_Y, number: 3, signals: [{ type: 'power', signal: 'GND' }] },
];

class Ky020TiltSwitchElement extends HTMLElement {
  readonly pinInfo = PIN_INFO;

  private _tilted = false;

  static get observedAttributes() {
    return ['tilted'];
  }

  get tilted() {
    return this._tilted;
  }

  set tilted(value: boolean) {
    const next = value === true || (value as unknown) === 'true';
    if (next === this._tilted) return;
    this._tilted = next;
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
    if (name === 'tilted') this.tilted = value !== null && value !== 'false';
  }

  private update() {
    const root = this.shadowRoot;
    if (!root) return;
    const capsule = root.querySelector('#capsule') as SVGGElement | null;
    if (capsule) capsule.setAttribute('transform', this._tilted ? 'rotate(20 32 17)' : '');
  }

  private render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        svg   { display: block; overflow: visible; }
        #capsule { transition: transform 120ms ease-out; }
      </style>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="ky020-holes">
            <rect width="${W}" height="${H}" fill="white"/>
            <g fill="black">
              <circle cx="7.5" cy="19" r="2.3"/><circle cx="56.5" cy="19" r="2.3"/>
              <circle cx="6.5" cy="6" r="1.2"/><circle cx="6.5" cy="31.5" r="1.2"/>
              <circle cx="57.5" cy="31.5" r="1.2"/>
            </g>
          </mask>
        </defs>

        <g mask="url(#ky020-holes)">
          <rect x="0.4" y="0.4" width="63.2" height="48.2" rx="1.6"
                fill="#1b1b1b" stroke="#8c958a" stroke-width="0.8"/>
          <g fill="#c6c9cc">
            <circle cx="7.5" cy="19" r="3.9"/><circle cx="56.5" cy="19" r="3.9"/>
            <circle cx="6.5" cy="6" r="2.6"/><circle cx="6.5" cy="31.5" r="2.6"/>
            <circle cx="57.5" cy="31.5" r="2.6"/>
          </g>
        </g>

        <g font-family="Arial, Helvetica, sans-serif" font-weight="bold" fill="#eeeae2">
          <text x="61.4" y="8.6" font-size="6" text-anchor="end">KY-020</text>
          <text x="4.6" y="46.6" font-size="7.5" text-anchor="middle">S</text>
          <text x="59.4" y="46.6" font-size="9" text-anchor="middle">-</text>
          <text x="26.4" y="35.6" font-size="4" font-weight="normal">R1</text>
        </g>

        <!-- 10k SMD resistor with its silkscreen box. -->
        <rect x="11.6" y="29.6" width="13" height="7.2" fill="none" stroke="#eeeae2" stroke-width="0.5"/>
        <rect x="13.2" y="31" width="9.8" height="4.4" fill="#141414"/>
        <rect x="13.2" y="31" width="1.7" height="4.4" fill="#c6c9cc"/>
        <rect x="21.3" y="31" width="1.7" height="4.4" fill="#c6c9cc"/>
        <text x="18.1" y="34.4" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
              font-size="3" fill="#eeeae2">103</text>

        <!-- Blue ball tilt switch with its white end caps and leads. -->
        <g id="capsule">
          <g transform="translate(32 17) rotate(35)">
            <g fill="#c6c9cc">
              <rect x="-16.6" y="-1.2" width="4" height="2.4"/>
              <rect x="12.6" y="-1.2" width="4" height="2.4"/>
            </g>
            <g fill="#f3f2ee" stroke="#c4c2bb" stroke-width="0.4">
              <path d="M-14.6 -7.2H-10.2V7.2H-14.6V2.4H-12.9V-2.4H-14.6Z"/>
              <path d="M14.6 -7.2H10.2V7.2H14.6V2.4H12.9V-2.4H14.6Z"/>
            </g>
            <rect x="-11" y="-6.4" width="22" height="12.8" rx="1.2"
                  fill="#2c83d9" stroke="#1a5ea8" stroke-width="0.6"/>
            <rect x="-9.2" y="-4.8" width="18.4" height="2.4" rx="1" fill="#5aa6ec"/>
          </g>
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

if (!customElements.get('velxio-ky-020-tilt-switch')) {
  customElements.define('velxio-ky-020-tilt-switch', Ky020TiltSwitchElement);
}

export { Ky020TiltSwitchElement };
