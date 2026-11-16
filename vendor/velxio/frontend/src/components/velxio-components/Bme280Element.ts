/**
 * Bme280Element.ts — BME280 temperature / pressure / humidity sensor breakout
 *
 * Velxio-native module (wokwi-elements has none). One element serves both
 * transports: the iot-skillsbench I2C task wires SDA/SCL, the SPI task wires
 * SCK/MISO/MOSI/CS — only wired pins matter for role resolution. Pin names
 * are the backlog ruling: VCC GND SCL SDA SCK MISO MOSI CS.
 *
 * Artwork: the purple GY-BME280 board, top-down, header edge at the bottom —
 * two large mounting holes, the 2.5 mm metal-lid sensor, SOT-23 regulator,
 * 0603 caps and "103" pull-ups, and a right-angle header whose eight pins
 * leave the board edge.
 *
 * Geometry (CSS px, canvas 128 × 72): board y 0.5–62, pads at y 51, pin tips
 * at the canvas bottom (y = 72) on x = 8 + 16·n.
 */

const W = 128;
const H = 72;
const PIN_Y = 72;
const PAD_Y = 51;

const BOARD = '#7a27a8';
const BOARD_EDGE = '#4d1470';
const TRACE = '#9a45c8';
const SILK = '#f4f0f8';
const RING = '#d2d5d9';
const RING_EDGE = '#9ea3a9';
const LID = '#cdd1d6';
const LID_EDGE = '#7c8289';
const CHIP = '#232325';
const TIN = '#c4c8cc';
const CAP_BODY = '#c8a26a';
const HEADER = '#1c1c1e';
const HEADER_LINE = '#3a3a3d';
const GOLD = '#d4a017';
const GOLD_DARK = '#9c7410';

const PIN_NAMES = ['VCC', 'GND', 'SCL', 'SDA', 'SCK', 'MISO', 'MOSI', 'CS'];

const PIN_INFO = PIN_NAMES.map((name, i) => ({
  name,
  x: 8 + 16 * i,
  y: PIN_Y,
  number: i + 1,
  signals:
    name === 'VCC'
      ? [{ type: 'power', signal: 'VCC' }]
      : name === 'GND'
        ? [{ type: 'power', signal: 'GND' }]
        : ([] as Array<unknown>),
}));

// 0603 resistor standing along y, centred on (x, y): black body, tinned ends, "103".
const resistor = (x: number, y: number) => `
  <rect x="${x - 2.5}" y="${y - 5}" width="5" height="10" fill="${TIN}"/>
  <rect x="${x - 2.5}" y="${y - 3.4}" width="5" height="6.8" fill="${CHIP}"/>
  <text x="${x}" y="${y + 1.1}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="3.2" fill="${SILK}" transform="rotate(-90 ${x} ${y})">103</text>`;

// 0603 capacitor standing along y, centred on (x, y).
const capacitor = (x: number, y: number) => `
  <rect x="${x - 2.5}" y="${y - 5}" width="5" height="10" fill="${TIN}"/>
  <rect x="${x - 2.5}" y="${y - 3.4}" width="5" height="6.8" fill="${CAP_BODY}"/>`;

class Bme280Element extends HTMLElement {
  readonly pinInfo = PIN_INFO;

  constructor() {
    super();
    const pins = PIN_INFO.map(
      (p) => `<line x1="${p.x}" y1="${PAD_Y}" x2="${p.x}" y2="${PIN_Y}" stroke="${GOLD}" stroke-width="2.2"/>`,
    ).join('');
    const pads = PIN_INFO.map(
      (p) => `<circle cx="${p.x}" cy="${PAD_Y}" r="3.1" fill="${GOLD}"/>
              <circle cx="${p.x}" cy="${PAD_Y}" r="1.2" fill="${GOLD_DARK}"/>`,
    ).join('');
    const labels = PIN_INFO.map((p) => `<text x="${p.x}" y="45.5">${p.name}</text>`).join('');
    const headerDividers = PIN_INFO.slice(1)
      .map((p) => `M${p.x - 8} 55V62.5`)
      .join('');
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        svg   { display: block; overflow: visible; }
      </style>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        ${pins}

        <!-- Board with the two mounting holes cut through. -->
        <path d="M2.5 0.5H125.5A2 2 0 0 1 127.5 2.5V60A2 2 0 0 1 125.5 62H2.5A2 2 0 0 1 0.5 60V2.5A2 2 0 0 1 2.5 0.5Z
                 M18.5 13A5.5 5.5 0 1 0 7.5 13A5.5 5.5 0 1 0 18.5 13Z
                 M120.5 13A5.5 5.5 0 1 0 109.5 13A5.5 5.5 0 1 0 120.5 13Z"
              fill="${BOARD}" fill-rule="evenodd" stroke="${BOARD_EDGE}" stroke-width="0.8"/>
        <g fill="none" stroke="${RING}" stroke-width="3">
          <circle cx="13" cy="13" r="7"/><circle cx="115" cy="13" r="7"/>
        </g>
        <g fill="none" stroke="${RING_EDGE}" stroke-width="0.5">
          <circle cx="13" cy="13" r="5.5"/><circle cx="115" cy="13" r="5.5"/>
          <circle cx="13" cy="13" r="8.5"/><circle cx="115" cy="13" r="8.5"/>
        </g>

        <!-- Copper traces under the solder mask. -->
        <g fill="none" stroke="${TRACE}" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">
          <path d="M11.5 48.5L16 44V26H23V7H31V10.5"/>
          <path d="M32 28V25.5H48V28M35 23V25.5M43 22V25.5M48 25.5H52V20H56"/>
          <path d="M80 28V25.5H112V28M78.5 22V25.5M92 22V25.5M72 17H76"/>
          <path d="M32 38V46L37 51M48 38V46L53 51M80 38V46L85 51M112 38V46L117 51M64 28V46L69 51"/>
        </g>

        <!-- SOT-23 regulator. -->
        <g fill="${TIN}">
          <rect x="30.2" y="10.5" width="1.6" height="3"/>
          <rect x="26.2" y="20" width="1.6" height="3"/><rect x="34.2" y="20" width="1.6" height="3"/>
        </g>
        <rect x="25" y="13" width="12" height="7.5" fill="${CHIP}"/>
        <text x="31" y="18" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
              font-size="3.2" fill="${SILK}">662K</text>

        ${capacitor(43, 17)}${capacitor(78.5, 17)}${capacitor(92, 17)}

        <!-- BME280: 2.5 mm metal lid with its vent hole. -->
        <rect x="56" y="12" width="16" height="16" rx="0.8" fill="${LID}" stroke="${LID_EDGE}" stroke-width="0.6"/>
        <rect x="57.6" y="13.6" width="12.8" height="12.8" rx="0.4" fill="none" stroke="#a3a8ae" stroke-width="0.4"/>
        <circle cx="67.2" cy="16.8" r="1.1" fill="#3a3d42"/>

        <!-- 10 k pull-ups on SCL, SDA, SDO (MISO) and CSB (CS). -->
        ${resistor(32, 33)}${resistor(48, 33)}${resistor(80, 33)}${resistor(112, 33)}

        <text x="64" y="9.6" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
              font-size="7" font-weight="bold" fill="${SILK}">BME280</text>

        <g font-family="Arial, Helvetica, sans-serif" font-size="5" font-weight="bold"
           fill="${SILK}" text-anchor="middle">${labels}</g>

        ${pads}
        <rect x="1.5" y="55" width="125" height="7.5" rx="0.6" fill="${HEADER}"/>
        <path d="${headerDividers}" stroke="${HEADER_LINE}" stroke-width="0.5"/>
      </svg>`;
  }
}

if (!customElements.get('velxio-bme280')) {
  customElements.define('velxio-bme280', Bme280Element);
}

export { Bme280Element };
