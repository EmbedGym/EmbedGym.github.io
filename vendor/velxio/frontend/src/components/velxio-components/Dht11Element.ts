/**
 * Dht11Element.ts — DHT11 single-wire temperature / humidity sensor.
 *
 * wokwi-elements ships a DHT22 but no DHT11, so this is a Velxio-native part.
 * The bare DHT11 has four leads (one NC); the three-pin part is the common
 * module, drawn face-on: the blue perforated DHT11 housing on a black PCB,
 * its four soldered leads below it, and a three-pin header at the bottom.
 *
 * Pin names follow `iot-skillsbench/skills-human-expert/dht11.md` (VCC / DATA /
 * GND) — the benchmark task JSON spells the data pin `data`, and the task JSON
 * was updated to `DATA` to match this ruling.
 *
 * Geometry (CSS px, canvas 60 × 84):
 *   Housing x 11–49, y 1–49; PCB x 4.5–55.5, y 4–69.
 *   Header pins at x = 16 / 30 / 44 leave the header at y 69.5 and end at
 *   y = 84, where the pin tips sit.
 */

const W = 60;
const H = 84;
const PIN_Y = 84;

const PCB = '#1e1f22';
const PCB_EDGE = '#000000';
const CASE = '#2fa0d2';
const CASE_EDGE = '#1a6f96';
const HOLE = '#0f3448';
const SILK = '#f2f2f2';
const SOLDER = '#c4c8cc';
const HEADER = '#2c2c2f';
const HEADER_LINE = '#4a4a4e';
const GOLD = '#d4a017';

const PIN_INFO = [
  { name: 'VCC', x: 16, y: PIN_Y, number: 1, signals: [{ type: 'power', signal: 'VCC' }] },
  { name: 'DATA', x: 30, y: PIN_Y, number: 2, signals: [] as Array<unknown> },
  { name: 'GND', x: 44, y: PIN_Y, number: 3, signals: [{ type: 'power', signal: 'GND' }] },
];

// Housing grille as on the real part: five rows of three square windows, with
// half-open slots on both side edges in rows 2, 3 and 5.
const ROW_TOPS = [8, 15.4, 22.8, 30.2, 37.6];
const EDGE_SLOT_ROWS = [1, 2, 4];
const WINDOWS = ROW_TOPS.flatMap((y) => [21.5, 30, 38.5].map((cx) => ({ x: cx - 2.5, y })));
const EDGE_SLOTS = EDGE_SLOT_ROWS.flatMap((row) => [
  { x: 10.4, y: ROW_TOPS[row] },
  { x: 45.6, y: ROW_TOPS[row] },
]);

class Dht11Element extends HTMLElement {
  readonly pinInfo = PIN_INFO;

  temperature = 25;
  humidity = 50;

  constructor() {
    super();
    const windows = WINDOWS.map(
      (w) => `<rect x="${w.x}" y="${w.y}" width="5" height="4.6" rx="0.8"/>`,
    ).join('');
    const edgeSlots = EDGE_SLOTS.map(
      (s) => `<rect x="${s.x}" y="${s.y}" width="4" height="4.6" rx="0.8"/>`,
    ).join('');
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        svg   { display: block; overflow: visible; }
      </style>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <g stroke="${GOLD}" stroke-width="2.4">
          ${PIN_INFO.map((p) => `<line x1="${p.x}" y1="64" x2="${p.x}" y2="${PIN_Y}"/>`).join('')}
        </g>

        <rect x="4.5" y="4" width="51" height="65" rx="1.5" fill="${PCB}" stroke="${PCB_EDGE}" stroke-width="0.8"/>

        <!-- DHT11 leads soldered through the PCB, inside their silkscreen outline. -->
        <rect x="13" y="49" width="34" height="8" fill="none" stroke="${SILK}" stroke-width="0.5"/>
        <g fill="${SOLDER}">
          <circle cx="18" cy="53" r="2"/><circle cx="26" cy="53" r="2"/>
          <circle cx="34" cy="53" r="2"/><circle cx="42" cy="53" r="2"/>
        </g>

        <!-- Housing: three notches in the top edge, then the window grille. -->
        <rect x="11" y="1" width="38" height="48" rx="1.6" fill="${CASE}" stroke="${CASE_EDGE}" stroke-width="0.8"/>
        <g fill="${HOLE}">
          <rect x="19" y="0.6" width="5" height="4" rx="0.8"/>
          <rect x="27.5" y="0.6" width="5" height="4" rx="0.8"/>
          <rect x="36" y="0.6" width="5" height="4" rx="0.8"/>
          ${windows}${edgeSlots}
        </g>

        <g font-family="Arial, Helvetica, sans-serif" font-size="5" font-weight="bold"
           fill="${SILK}" text-anchor="middle">
          <text x="16" y="64">VCC</text><text x="30" y="64">DATA</text><text x="44" y="64">GND</text>
        </g>
        <rect x="9.5" y="65" width="41" height="4.5" rx="0.4" fill="${HEADER}"/>
        <path d="M23 65V69.5M37 65V69.5" stroke="${HEADER_LINE}" stroke-width="0.5"/>
      </svg>`;
  }
}

if (!customElements.get('velxio-dht11')) {
  customElements.define('velxio-dht11', Dht11Element);
}
