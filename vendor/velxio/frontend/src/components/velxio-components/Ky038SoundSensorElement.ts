/**
 * Ky038SoundSensorElement.ts — KY-038 microphone sound sensor module
 *
 * wokwi-elements' big/small sound sensors carry their own pin naming and
 * never drive D0 from a threshold, so this is a Velxio-native module under
 * its own metadata id (ruling: pins A0/D0, matching the skill doc, not the
 * task's original analog/digital). The pin names here are what circuit wiring
 * and role resolution key off.
 *
 * The `detected` property mirrors D0: true = sound level above threshold, and
 * lights the board's D0 LED.
 *
 * Artwork: the common red KY-038 (electret capsule, blue 3296 trimmer, LM393,
 * power and D0 LEDs, one mounting hole), top-down and not to scale: the real
 * board is a 44 × 15 mm strip with the header on a short end, redrawn here as
 * a 72 × 47 board with a right-angle header along its bottom edge.
 *
 * Geometry (CSS px, canvas 72 × 60): four header pins with their tips on the
 * bottom edge at x = 12 / 28 / 44 / 60, in the board's own order A0 / GND /
 * VCC / D0.
 */

const W = 72;
const H = 60;
const PIN_Y = 60;

const LED_OFF = '#f4efe6';
const LED_ON = '#ff2a1a';

const PIN_INFO = [
  { name: 'A0', x: 12, y: PIN_Y, number: 1, signals: [] as Array<unknown> },
  { name: 'GND', x: 28, y: PIN_Y, number: 2, signals: [{ type: 'power', signal: 'GND' }] },
  { name: 'VCC', x: 44, y: PIN_Y, number: 3, signals: [{ type: 'power', signal: 'VCC' }] },
  { name: 'D0', x: 60, y: PIN_Y, number: 4, signals: [] as Array<unknown> },
];

class Ky038SoundSensorElement extends HTMLElement {
  readonly pinInfo = PIN_INFO;

  private _detected = false;

  static get observedAttributes() {
    return ['detected'];
  }

  get detected() {
    return this._detected;
  }

  set detected(value: boolean) {
    const next = value === true || (value as unknown) === 'true';
    if (next === this._detected) return;
    this._detected = next;
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
    if (name === 'detected') this.detected = value !== null && value !== 'false';
  }

  private update() {
    const led = this.shadowRoot?.querySelector('#led');
    if (led) led.setAttribute('fill', this._detected ? LED_ON : LED_OFF);
  }

  private render() {
    if (!this.shadowRoot) return;
    const pins = PIN_INFO.map(
      (p) => `<rect x="${p.x - 1.1}" y="40.5" width="2.2" height="${PIN_Y - 40.5}" fill="#d4a017"/>`,
    ).join('');
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        svg   { display: block; overflow: visible; }
      </style>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ky038-felt" width="1.4" height="1.4" patternUnits="userSpaceOnUse">
            <circle cx="0.7" cy="0.7" r="0.3" fill="#3a3a3e"/>
          </pattern>
        </defs>

        <!-- Red PCB with its one mounting hole cut through. -->
        <path d="M2 0.5H70A1.5 1.5 0 0 1 71.5 2V45A1.5 1.5 0 0 1 70 46.5H2A1.5 1.5 0 0 1 0.5 45V2A1.5 1.5 0 0 1 2 0.5Z
                 M65.5 26A3 3 0 1 0 59.5 26A3 3 0 1 0 65.5 26Z"
              fill="#c8161d" fill-rule="evenodd" stroke="#8c0d12" stroke-width="0.8"/>
        <circle cx="62.5" cy="26" r="4.2" fill="none" stroke="#dfe2e6" stroke-width="2.2"/>

        <!-- Electret capsule standing on the board: tin can rim, black felt face. -->
        <circle cx="13.5" cy="15" r="11.2" fill="#c9cdd1" stroke="#7d848b" stroke-width="0.8"/>
        <circle cx="13.5" cy="15" r="9" fill="#1f1f22"/>
        <circle cx="13.5" cy="15" r="9" fill="url(#ky038-felt)"/>

        <!-- 3296W multi-turn trimmer with its brass adjust screw. -->
        <rect x="29" y="2.5" width="18" height="18" rx="1" fill="#2a5bd0" stroke="#173a8c" stroke-width="0.8"/>
        <text x="39.5" y="16.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
              font-size="4.2" font-weight="bold" fill="#c7d6fa">W104</text>
        <circle cx="33.3" cy="6.8" r="2.9" fill="#d3ae4f" stroke="#8a6d1f" stroke-width="0.6"/>
        <path d="M31.4 8.7L35.2 4.9" stroke="#6b5316" stroke-width="0.9"/>

        <!-- LM393 comparator, SOIC-8. -->
        <g fill="#c8cacd">
          <rect x="31.3" y="23.2" width="1.1" height="1.6"/><rect x="34.1" y="23.2" width="1.1" height="1.6"/>
          <rect x="36.9" y="23.2" width="1.1" height="1.6"/><rect x="39.7" y="23.2" width="1.1" height="1.6"/>
          <rect x="31.3" y="31.6" width="1.1" height="1.6"/><rect x="34.1" y="31.6" width="1.1" height="1.6"/>
          <rect x="36.9" y="31.6" width="1.1" height="1.6"/><rect x="39.7" y="31.6" width="1.1" height="1.6"/>
        </g>
        <rect x="30.4" y="24.8" width="11.3" height="6.8" fill="#232325" stroke="#0d0d0e" stroke-width="0.4"/>
        <circle cx="31.9" cy="30.2" r="0.6" fill="#55575c"/>

        <!-- SMD resistors and a capacitor. -->
        <g stroke="#c8cacd" stroke-width="0.5">
          <rect x="50" y="18" width="6" height="3" fill="#1e1e20"/>
          <rect x="49.5" y="24" width="3" height="6" fill="#1e1e20"/>
          <rect x="25.5" y="24" width="3" height="6" fill="#1e1e20"/>
          <rect x="44" y="24" width="3" height="6" fill="#c9a06a"/>
        </g>

        <!-- Power LED and D0 LED in silkscreen boxes. -->
        <g fill="none" stroke="#f4f4f4" stroke-width="0.6">
          <rect x="59" y="2" width="11.5" height="7" rx="0.5"/>
          <rect x="59" y="10.5" width="11.5" height="7" rx="0.5"/>
        </g>
        <g fill="#c8cacd">
          <rect x="60.3" y="3.2" width="1.4" height="4.6"/><rect x="67.8" y="3.2" width="1.4" height="4.6"/>
          <rect x="60.3" y="11.7" width="1.4" height="4.6"/><rect x="67.8" y="11.7" width="1.4" height="4.6"/>
        </g>
        <rect x="61.7" y="3.2" width="6.1" height="4.6" fill="#f4efe6"/>
        <rect id="led" x="61.7" y="11.7" width="6.1" height="4.6" fill="${LED_OFF}"/>

        <g fill="#f4f4f4" font-family="Arial, Helvetica, sans-serif" font-weight="bold">
          <g font-size="3.6" text-anchor="end">
            <text x="57.8" y="6.8">PWR</text>
            <text x="57.8" y="15.3">D0</text>
          </g>
          <text x="13.5" y="32.2" font-size="4.6" text-anchor="middle">KY-038</text>
          <g font-size="4.6" text-anchor="middle">
            <text x="12" y="39">A0</text>
            <text x="28" y="39">GND</text>
            <text x="44" y="39">+</text>
            <text x="60" y="39">D0</text>
          </g>
        </g>

        <!-- Right-angle header: plastic spacer on the board edge, pins out the bottom. -->
        <rect x="5" y="40.5" width="62" height="6" fill="#1c1c1e"/>
        <g stroke="#3a3a3d" stroke-width="0.5">
          <path d="M20 40.5V46.5M36 40.5V46.5M52 40.5V46.5"/>
        </g>
        ${pins}
      </svg>
    `;
    this.update();
  }
}

if (!customElements.get('velxio-ky-038-sound-sensor')) {
  customElements.define('velxio-ky-038-sound-sensor', Ky038SoundSensorElement);
}

export { Ky038SoundSensorElement };
