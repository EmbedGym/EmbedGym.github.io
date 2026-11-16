/**
 * JoystickElement.ts — KY-023 2-axis analog joystick module
 *
 * Velxio-native module: the wokwi analog-joystick element uses VERT/HORZ/SEL
 * pin names and directional output, which doesn't match the iot-skillsbench
 * pinout (GND/VCC/VRx/VRy/SW per the human-expert skill). Pin names here are
 * what circuit wiring and role resolution key off.
 *
 * Artwork: the common black KY-023, top-down and not to scale — thumbstick cap
 * on its gimbal dome, the two 10 kΩ axis pots and the push switch peeking out
 * from under it, a mounting hole per corner, right-angle header at the bottom
 * silkscreened GND / +5V / VRx / VRy / SW.
 *
 * Geometry (CSS px, canvas 72 × 68): five header pins with their tips on the
 * bottom edge at x = 8 / 22 / 36 / 50 / 64.
 */

const W = 72;
const H = 68;
const PIN_Y = 68;

const PIN_NAMES = ['GND', 'VCC', 'VRx', 'VRy', 'SW'];
const SILKSCREEN: Record<string, string> = { VCC: '+5V' };

const PIN_INFO = PIN_NAMES.map((name, i) => ({
  name,
  x: 8 + 14 * i,
  y: PIN_Y,
  number: i + 1,
  signals:
    name === 'VCC'
      ? [{ type: 'power', signal: 'VCC' }]
      : name === 'GND'
        ? [{ type: 'power', signal: 'GND' }]
        : ([] as Array<unknown>),
}));

const HOLES = [
  [6, 6],
  [66, 6],
  [6, 37],
  [66, 37],
];

class JoystickElement extends HTMLElement {
  readonly pinInfo = PIN_INFO;

  constructor() {
    super();
    const pins = PIN_INFO.map(
      (p) => `<rect x="${p.x - 1.1}" y="50" width="2.2" height="${PIN_Y - 50}" fill="#d4a017"/>`,
    ).join('');
    const labels = PIN_INFO.map(
      (p) => `<text x="${p.x}" y="48.4">${SILKSCREEN[p.name] ?? p.name}</text>`,
    ).join('');
    const holeCuts = HOLES.map(
      ([x, y]) => `M${x + 2.2} ${y}A2.2 2.2 0 1 0 ${x - 2.2} ${y}A2.2 2.2 0 1 0 ${x + 2.2} ${y}Z`,
    ).join(' ');
    const holeRings = HOLES.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join('');
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        svg   { display: block; overflow: visible; }
      </style>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ky023-grip" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
            <circle cx="0.8" cy="0.8" r="0.35" fill="#3f3f44"/>
          </pattern>
        </defs>

        <!-- Black PCB with four mounting holes cut through. -->
        <path d="M2 0.5H70A1.5 1.5 0 0 1 71.5 2V54A1.5 1.5 0 0 1 70 55.5H2A1.5 1.5 0 0 1 0.5 54V2A1.5 1.5 0 0 1 2 0.5Z ${holeCuts}"
              fill="#1c1c1e" fill-rule="evenodd" stroke="#000000" stroke-width="0.8"/>
        <g fill="none" stroke="#dfe2e6" stroke-width="1.4">${holeRings}</g>

        <text x="4.6" y="21.5" transform="rotate(-90 4.6 21.5)" text-anchor="middle"
              font-family="Arial, Helvetica, sans-serif" font-size="4.4" font-weight="bold"
              fill="#f4f4f4">KY-023</text>

        <!-- Axis pots (black housings, cream rotors) and the push switch. -->
        <rect x="9" y="12.5" width="8" height="20" rx="0.8" fill="#2b2b2e" stroke="#4a4a4f" stroke-width="0.6"/>
        <rect x="10.6" y="20" width="2.4" height="5" fill="#e9e4d3"/>
        <rect x="26" y="38" width="20" height="6.5" rx="0.8" fill="#2b2b2e" stroke="#4a4a4f" stroke-width="0.6"/>
        <rect x="33.5" y="41.4" width="5" height="2.4" fill="#e9e4d3"/>
        <rect x="54.5" y="17" width="7.5" height="11" rx="0.6" fill="#b9bcbf" stroke="#7d848b" stroke-width="0.5"/>
        <rect x="57" y="19" width="5" height="7" fill="#e9e4d3" stroke="#a8a294" stroke-width="0.4"/>
        <rect x="65" y="17" width="3" height="6" fill="#1e1e20" stroke="#c8cacd" stroke-width="0.5"/>
        <text x="66.5" y="28.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
              font-size="3.4" font-weight="bold" fill="#f4f4f4">R1</text>

        <!-- Gimbal dome and the thumb cap on top of it. -->
        <circle cx="36" cy="21.5" r="19.8" fill="#2a2a2d" stroke="#5a5a60" stroke-width="0.9"/>
        <circle cx="36" cy="21.5" r="15" fill="#323236" stroke="#121214" stroke-width="0.8"/>
        <circle cx="36" cy="21.5" r="15" fill="url(#ky023-grip)"/>
        <circle cx="36" cy="21.5" r="11.6" fill="none" stroke="#45454a" stroke-width="0.7"/>

        <g fill="#f4f4f4" font-family="Arial, Helvetica, sans-serif" font-size="4.4"
           font-weight="bold" text-anchor="middle">${labels}</g>

        <!-- Right-angle header: plastic spacer on the board edge, pins out the bottom. -->
        <rect x="2.5" y="50" width="67" height="5.5" fill="#111113" stroke="#3a3a3d" stroke-width="0.4"/>
        <g stroke="#3a3a3d" stroke-width="0.5">
          <path d="M15 50V55.5M29 50V55.5M43 50V55.5M57 50V55.5"/>
        </g>
        ${pins}
      </svg>`;
  }
}

if (!customElements.get('velxio-joystick')) {
  customElements.define('velxio-joystick', JoystickElement);
}

export { JoystickElement };
