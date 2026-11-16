/**
 * nRF52840 DK Web Component
 *
 * Top view traced from Nordic's nRF52840 DK STEP model. Drawing units are mm
 * and the element renders at 96 dpi, the same scale as wokwi-arduino-mega.
 * Like the Mega drawing, only headers, connectors, switches, buttons, LEDs and
 * the large ICs are drawn; passives and the bottom-side coin cell are omitted.
 * Pin tips are female-header hole centers in CSS px relative to the element's
 * top-left.
 */

const BOARD_W = 136.535;
const BOARD_H = 63.5;
const PX_PER_MM = 96 / 25.4;
const PITCH = 2.54;

interface Hole {
  label: string;
  /** pinInfo name; absent for holes that are not wiring targets. */
  pin?: string;
}

interface PlacedHole extends Hole {
  x: number;
  y: number;
}

const io = (name: string): Hole => ({ label: name, pin: name });

const placeRow = (x0: number, y: number, holes: Hole[]): PlacedHole[] =>
  holes.map((hole, i) => ({ ...hole, x: x0 + i * PITCH, y }));

// Silkscreen order, left to right; the x argument is the first hole center.
const TOP_ROWS = [
  placeRow(18.775, 7.62, [
    io('P0.27'),
    io('P0.26'),
    io('P0.02'),
    { label: 'GND', pin: 'GND.1' },
    ...['P1.15', 'P1.14', 'P1.13', 'P1.12', 'P1.11', 'P1.10'].map(io),
  ]),
  placeRow(45.772, 7.62, ['P1.08', 'P1.07', 'P1.06', 'P1.05', 'P1.04', 'P1.03', 'P1.02', 'P1.01'].map(io)),
  placeRow(68.632, 7.62, ['P0.10', 'P0.09', 'P0.08', 'P0.07', 'P0.06', 'P0.05', 'P0.01', 'P0.00'].map(io)),
];

const BOTTOM_ROWS = [
  placeRow(27.982, 55.88, [
    { label: 'VDD' },
    { label: 'VDD' },
    { label: 'RESET' },
    { label: 'VDD', pin: 'VDD' },
    { label: '5V', pin: '5V' },
    { label: 'GND', pin: 'GND.2' },
    { label: 'GND' },
    { label: 'N.C.' },
  ]),
  placeRow(50.842, 55.88, ['P0.03', 'P0.04', 'P0.28', 'P0.29', 'P0.30', 'P0.31'].map(io)),
];

// 2×9 header right of the Arduino headers, one [left, right] pair per row.
const SIDE_X = 94.03;
const SIDE_Y = 10.16;
const SIDE_ROWS = [
  [io('P0.11'), io('P0.12')],
  [io('P0.13'), io('P0.14')],
  [io('P0.15'), io('P0.16')],
  [io('P0.17'), io('P0.18')],
  [io('P0.19'), io('P0.20')],
  [io('P0.21'), io('P0.22')],
  [io('P0.23'), io('P0.24')],
  [io('P0.25'), io('P1.00')],
  [io('P1.09'), { label: 'GND' }],
].map((row, i) => placeRow(SIDE_X, SIDE_Y + i * PITCH, row));

const TOP_HOLES = TOP_ROWS.flat();
const BOTTOM_HOLES = BOTTOM_ROWS.flat();
const SIDE_HOLES = SIDE_ROWS.flat();

const PINS_NRF52840_DK = [...TOP_HOLES, ...BOTTOM_HOLES, ...SIDE_HOLES]
  .filter((hole) => hole.pin)
  .map((hole) => ({ name: hole.pin!, x: hole.x * PX_PER_MM, y: hole.y * PX_PER_MM }));

const MOUNTING_HOLES = [
  [15.245, 7.62],
  [90.175, 7.62],
  [128.275, 17.14],
  [66.045, 22.86],
  [66.045, 50.8],
  [13.975, 55.88],
  [96.525, 55.88],
];

const box = (x0: number, y0: number, x1: number, y1: number, cls: string) =>
  `<rect class="${cls}" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/>`;

const circle = (cx: number, cy: number, r: number, cls: string) =>
  `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}"/>`;

const holePath = ([cx, cy]: number[], r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

// Outline with the notch under the nRF USB connector; mounting holes are cut out.
const PCB_PATH =
  'M1.02 0H132.975A1.02 1.02 0 0 1 133.995 1.02V17.14L136.535 19.68V53.34L133.995 55.88V62.48' +
  'A1.02 1.02 0 0 1 132.975 63.5H97.035A0.51 0.51 0 0 1 96.525 62.99V62.51A0.51 0.51 0 0 0 96.015 62' +
  'H83.535A0.51 0.51 0 0 0 83.025 62.51V62.99A0.51 0.51 0 0 1 82.515 63.5H1.02' +
  'A1.02 1.02 0 0 1 0 62.48V1.02A1.02 1.02 0 0 1 1.02 0Z' +
  MOUNTING_HOLES.map((c) => holePath(c, 1.5)).join('');

const BEVEL =
  'm 0 0 v 0.762 l 0.433,0.433 c 0.046,-0.046 0.074,-0.109 0.074,-0.179 v -1.27 c 0,-0.070 -0.028,-0.133 -0.074,-0.179 z';

// Same pattern and sizing as wokwi-arduino-mega's headers; a cell's hole center
// sits at (1.46, 1.277), so the header is offset from its first hole by that.
const PINS_FEMALE_PATTERN = `
  <pattern id="pins-female" width="2.54" height="2.54" patternUnits="userSpaceOnUse">
    <rect x="0" y="0" width="2.54" height="2.54" fill="#333"></rect>
    <rect x="1.079" y="0.896" width="0.762" height="0.762" style="fill: #191919"></rect>
    <path transform="translate(1.079, 1.658) rotate(180 0 0)" d="${BEVEL}" style="opacity: 0.25"></path>
    <path transform="translate(1.841, 1.658) rotate(90 0 0)" d="${BEVEL}" style="opacity: 0.3; fill: #fff"></path>
    <path transform="translate(1.841, 0.896)" d="${BEVEL}" style="opacity: 0.15; fill: #fff"></path>
    <path transform="translate(1.079, 0.896) rotate(270 0 0)" d="${BEVEL}" style="opacity: 0.35"></path>
  </pattern>`;

const femaleHeader = (x: number, y: number, cols: number, rows: number) =>
  `<g transform="translate(${x - 1.46} ${y - 1.277})">` +
  `<rect width="${0.38 + cols * PITCH}" height="${rows * PITCH}" fill="url(#pins-female)"/></g>`;

// Male headers in the Mega's pin-male style: grey body, light round pin tips.
const malePin = (cx: number, cy: number) => `<ellipse class="male-pin" cx="${cx}" cy="${cy}" rx="0.5" ry="0.5"/>`;

// Unpopulated through-hole rows beside the Arduino headers.
const throughHoles = (holes: PlacedHole[], ys: number[]) =>
  holes.flatMap((h) => ys.map((y) => circle(h.x, y, 0.52, 'pth'))).join('');

// Rotated labels read bottom-to-top: top-header labels hang below the header,
// bottom-header labels stand above it.
const topLabels = () =>
  TOP_HOLES.map(
    (h) => `<text class="pin" text-anchor="end" transform="translate(${h.x + 0.62} 10) rotate(-90)">${h.label}</text>`,
  ).join('');

const bottomLabels = () =>
  BOTTOM_HOLES.map(
    (h) => `<text class="pin" transform="translate(${h.x + 0.62} 53.4) rotate(-90)">${h.label}</text>`,
  ).join('');

const sideLabels = () =>
  SIDE_ROWS.map(
    ([left, right]) =>
      `<text class="side" text-anchor="end" x="${left.x - 2.05}" y="${left.y + 0.55}">${left.label}</text>` +
      `<text class="side" x="${right.x + 2.05}" y="${right.y + 0.55}">${right.label}</text>`,
  ).join('');

const goldPin = (cx: number, cy: number, size: number) =>
  box(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2, 'gold');

function maleHeaders(): string {
  let svg = '';

  // P20: 1×13.
  svg += `<rect class="male" x="17.99" y="16.7" width="32.6" height="2.12" rx="0.3"/>`;
  for (let i = 0; i < 13; i++) {
    svg += malePin(19.05 + i * PITCH, 17.76);
  }

  // P5: 2×3.
  for (const x of [63.82, 66.36]) {
    svg += `<rect class="male" x="${x - 1.06}" y="26.67" width="2.12" height="7.62" rx="0.3"/>`;
    for (const y of [27.94, 30.48, 33.02]) {
      svg += malePin(x, y);
    }
  }

  // Debug out: 2×5 1.27 mm shrouded header, vertical.
  for (let i = 0; i < 5; i++) {
    const y = 2.225 + i * 1.27;
    svg += box(1.15, y - 0.2, 1.53, y + 0.2, 'tin') + box(6.61, y - 0.2, 6.99, y + 0.2, 'tin');
  }
  svg += box(1.53, 1.59, 6.61, 7.94, 'plastic') + box(2.75, 1.9, 5.39, 7.63, 'cavity');
  for (let i = 0; i < 5; i++) {
    svg += goldPin(3.435, 2.225 + i * 1.27, 0.41) + goldPin(4.705, 2.225 + i * 1.27, 0.41);
  }

  // Debug in: 2×5 1.27 mm shrouded header, horizontal.
  for (let i = 0; i < 5; i++) {
    const x = 80.085 + i * 1.27;
    svg += box(x - 0.2, 32.19, x + 0.2, 32.57, 'tin') + box(x - 0.2, 37.65, x + 0.2, 38.04, 'tin');
  }
  svg += box(79.45, 32.57, 85.8, 37.65, 'plastic') + box(79.76, 33.79, 85.49, 36.43, 'cavity');
  for (let i = 0; i < 5; i++) {
    svg += goldPin(80.085 + i * 1.27, 34.48, 0.41) + goldPin(80.085 + i * 1.27, 35.75, 0.41);
  }

  // Right-angle 2-pin headers along the left edge.
  for (const y0 of [9.65, 17.91, 41.72]) {
    for (const y of [y0 + 1.27, y0 + 3.81]) {
      svg += `<path class="tin" d="M0.13 ${y}L0.45 ${y - 0.32}H13.09V${y + 0.32}H0.45Z"/>`;
    }
    svg += box(5.97, y0, 8.51, y0 + 5.08, 'plastic');
  }
  return svg;
}

function usbConnectors(): string {
  // Interface USB (opening left) and nRF USB (opening down, over the board notch).
  return (
    box(0, 28.57, 5.35, 35.47, 'shell') +
    box(0, 28.02, 0.6, 36.02, 'shell') +
    box(0.9, 29.3, 4.9, 34.74, 'shell-top') +
    box(86.29, 56.65, 93.19, 62.6, 'shell') +
    box(85.74, 62, 93.74, 62.6, 'shell') +
    box(87.02, 57.1, 92.46, 61.7, 'shell-top')
  );
}

function slideSwitches(): string {
  let svg = '';
  // SW6 (nRF ONLY | DEFAULT) and the power switch are the same part, rotated 180°.
  svg += box(104.75, 1.89, 106.3, 3.84, 'knob-dark') + box(100.17, 3.84, 108.97, 7.44, 'shell');
  svg += circle(101.1, 5.6, 0.4, 'cavity') + circle(108.04, 5.6, 0.4, 'cavity');
  svg += box(4, 59.94, 5.5, 61.89, 'knob-dark') + box(1.37, 56.34, 10.17, 59.94, 'shell');
  svg += circle(2.3, 58.1, 0.4, 'cavity') + circle(9.24, 58.1, 0.4, 'cavity');

  // nRF power source.
  svg += box(17.91, 23.37, 29.91, 26.87, 'shell') + box(21.1, 24.27, 26.7, 25.97, 'cavity');
  svg += box(21.66, 24.37, 23.16, 25.87, 'knob');

  // VEXT → nRF.
  svg += box(18.13, 57.15, 23.53, 61.15, 'switch-body') + box(19.27, 58.33, 22.27, 59.97, 'cavity');
  svg += box(19.33, 58.35, 20.73, 59.95, 'knob');

  // TRACE and the small switch below the interface MCU.
  svg += box(79.65, 18.32, 85.05, 20.82, 'switch-body') + box(81.75, 19.22, 82.95, 19.92, 'knob');
  svg += box(42.55, 42.82, 47.95, 45.32, 'switch-body') + box(44.65, 43.72, 45.85, 44.42, 'knob');
  return svg;
}

function otherConnectors(): string {
  let svg = '';
  // Li-Po JST.
  svg += box(0.51, 48.75, 4.76, 52.75, 'jst') + box(1, 49.4, 4.3, 52.1, 'jst-cavity');
  // NFC FPC connector.
  svg += box(122.41, 53.86, 127.01, 57.91, 'jst') + box(122.6, 56.9, 126.82, 57.91, 'jst-cavity');
  for (let i = 0; i < 5; i++) {
    const x = 123.71 + i * 0.5;
    svg += box(x - 0.1, 53.86, x + 0.1, 54.6, 'gold');
  }
  // RF test connector.
  svg += box(126, 24.07, 128.82, 24.74, 'gold') + box(126.16, 23.15, 128.66, 25.65, 'plastic');
  svg += circle(127.41, 24.4, 0.95, 'gold') + circle(127.41, 24.4, 0.55, 'cavity') + circle(127.41, 24.4, 0.2, 'gold');
  return svg;
}

const chip = (x0: number, y0: number, x1: number, y1: number, dotX: number, dotY: number) =>
  box(x0, y0, x1, y1, 'chip') + circle(dotX, dotY, 0.35, 'dot');

const LEDS = [
  { label: 'LED1', x: 110.33, y: 9.23 },
  { label: 'LED2', x: 116.68, y: 9.23 },
  { label: 'LED3', x: 110.33, y: 13.04 },
  { label: 'LED4', x: 116.68, y: 13.04 },
];

const led = (x0: number, y0: number) =>
  box(x0, y0, x0 + 1.9, y0 + 0.7, 'gold') + box(x0 + 0.45, y0, x0 + 1.45, y0 + 0.7, 'led');

const BUTTONS = [
  { label: 'Button 1', x: 102.12, y: 46.51 },
  { label: 'Button 2', x: 112.28, y: 46.51 },
  { label: 'Button 3', x: 102.12, y: 56.04 },
  { label: 'Button 4', x: 112.28, y: 56.04 },
  { label: 'IF BOOT/RESET', x: 74.18, y: 56.04 },
];

function button(x0: number, y0: number): string {
  // Solder tabs stick out of the left and right sides near each corner.
  const tabs = [0.6, 4.6]
    .map((dy) => box(x0, y0 + dy, x0 + 1, y0 + dy + 0.8, 'tin') + box(x0 + 5.5, y0 + dy, x0 + 6.5, y0 + dy + 0.8, 'tin'))
    .join('');
  return (
    tabs +
    `<rect class="shell" x="${x0 + 0.55}" y="${y0}" width="5.4" height="6" rx="0.2"/>` +
    circle(x0 + 3.25, y0 + 3, 1.7, 'cap')
  );
}

// Nordic Semiconductor logo paths (logo units; mark x 30.9–103.4, wordmark y 81.3–121.7).
const NORDIC_MARK = [
  { opacity: 0.6, d: 'M82.9,0.4c0,0-0.1,0-0.1,0.1c-0.2,0.1-0.3,0.2-0.5,0.2L66.8,9.6l18,10.4V0C84.2,0,83.5,0.2,82.9,0.4z' },
  { opacity: 0.8, d: 'M51.2,63.1l16.4-9.5l-18-10.4l0,20.3C50.1,63.6,50.6,63.4,51.2,63.1z' },
  { opacity: 0.5, d: 'M103.2,52.5L66.3,31.2l0,0l-1.7-1L31.3,10.9c-0.2,0.6-0.4,1.2-0.4,1.9c0,0.1,0,0.3,0,0.4v38.2 c0,1.2,0.7,2.3,1.7,2.9l15.2,8.9c0.5,0.3,1.1,0.4,1.7,0.4l0-19.5l0-0.8L84,63.2c0.1,0.1,0.2,0.1,0.3,0.1c0,0,0.1,0,0.1,0 c1,0.4,1.8,0.1,2.7-0.5l5.8-3.3l9.2-5.5C102.6,53.7,103,53.1,103.2,52.5z' },
  { opacity: 1, d: 'M103.4,27.3V12.8c0-1.9-1-3.6-2.6-4.5L87.4,0.6C86.6,0.2,85.7,0,84.8,0v20.1L54.7,2.6l-3.4-1.9 c-1.5-0.8-2.8-0.9-4.3-0.2c0,0-0.1,0-0.1,0.1c-0.2,0.1-0.3,0.2-0.5,0.3l-5.3,3.1l-7.6,4.4c0,0,0,0,0,0c-1,0.6-1.8,1.5-2.3,2.6 c0,0,33.3,19.2,33.3,19.2l1.7,1l0,0l36.9,21.3c0.2-0.7,0.2-1.9,0.2-1.9V27.3z' },
];
const NORDIC_WORDMARK = 'M28.4,121.5h-1.7l-0.9-5.8h0l-1.7,4.5H23l-1.7-4.5h0l-0.9,5.8h-1.7l1.6-9h1.2l2,5.1h0l2-5.1h1.2L28.4,121.5zM21,106.1l-4.1,0L5,89.5h0l0,16.7l-4.4,0l0-24.3l4.1,0l11.8,16.7h0l0-16.7l4.4,0L21,106.1zM50.8,94c0,7.5-5.5,12.7-12.7,12.7c-7.2,0-12.7-5.1-12.7-12.7c0-7.5,5.5-12.7,12.7-12.7C45.3,81.3,50.8,86.5,50.8,94z M30.3,94c0,4.8,3.3,8.1,7.8,8.1c4.6,0,7.8-3.3,7.8-8.1c0-4.8-3.3-8.1-7.8-8.1C33.6,85.9,30.3,89.2,30.3,94zM61.7,96.4l-1.7,0l0,9.7l-4.4,0l0-24.3l8.9,0c4.8,0,7.8,3,7.8,7.4c0,3.6-2.1,6.3-5.7,7l7.2,9.9l-5.6,0L61.7,96.4z M60.1,92.5l3.8,0c2.6,0,3.8-1.2,3.8-3.3c0-2-1.2-3.3-3.8-3.3l-3.8,0L60.1,92.5zM98.1,94c0,7.6-5.3,12.1-12.6,12.1l-7.8,0l0-24.3l7.8,0C92.8,81.8,98.1,86.4,98.1,94z M82.2,85.9l0,16.1l3.5,0 c4.4,0,7.6-2.8,7.6-8s-3.3-8-7.6-8L82.2,85.9zM107.3,106.1l-4.5,0l0-24.3l4.5,0L107.3,106.1zM112.1,94c0-7.7,5.4-12.7,13.1-12.7c3.7,0,6.5,1.1,8.7,2.7l-2.6,3.9c-1.5-1-3.5-2-6.1-2c-4.7,0-8.2,3.2-8.2,8.1 c0,5,3.5,8.1,8.2,8.1c2.6,0,4.6-1,6.1-2l2.6,3.9c-2.2,1.5-4.9,2.7-8.7,2.7C117.6,106.6,112.1,101.6,112.1,94zM0,120.8l0.7-1.5c0.7,0.4,1.6,0.8,2.4,0.8c0.8,0,1.3-0.4,1.3-0.9c0-0.5-0.3-0.8-0.9-1.2l-1.5-1c-1-0.7-1.4-1.4-1.4-2.4 c0-1.4,1-2.3,2.7-2.3c0.9,0,1.8,0.2,2.6,0.6l-0.7,1.5c-0.7-0.3-1.3-0.6-1.9-0.6c-0.7,0-0.9,0.3-0.9,0.7c0,0.3,0.2,0.6,0.7,0.9 l1.6,1.1c1,0.7,1.5,1.4,1.5,2.5c0,1.7-1.2,2.6-3.1,2.6C1.9,121.7,0.8,121.4,0,120.8M15.2,120l0,1.5l-5.4,0l0-9l5.3,0l0,1.5l-3.7,0l0,1.8h3.4l0,1.5l-3.4,0l0,2.6H15.2zM33.7,121.5h-1.7l0-9h1.7L33.7,121.5zM33.7,121.5H32l0-9h1.7L33.7,121.5zM37.1,117c0-2.8,2-4.7,4.9-4.7c1.4,0,2.4,0.4,3.2,1l-0.9,1.4c-0.6-0.4-1.3-0.7-2.3-0.7c-1.7,0-3,1.2-3,3c0,1.8,1.3,3,3,3 c1,0,1.7-0.4,2.3-0.7l0.9,1.4c-0.8,0.6-1.8,1-3.2,1C39.1,121.7,37.1,119.9,37.1,117zM57.3,117c0,2.8-2,4.7-4.7,4.7c-2.7,0-4.7-1.9-4.7-4.7s2-4.7,4.7-4.7C55.2,112.3,57.3,114.2,57.3,117z M49.7,117 c0,1.8,1.2,3,2.9,3c1.7,0,2.9-1.2,2.9-3c0-1.8-1.2-3-2.9-3C50.9,114,49.7,115.2,49.7,117zM68.3,121.5h-1.5l-4.4-6.2h0l0,6.2h-1.6l0-9h1.5l4.4,6.2h0l0-6.2h1.6L68.3,121.5zM79.9,117c0,2.8-2,4.5-4.7,4.5l-2.9,0l0-9l2.9,0C77.9,112.5,79.9,114.2,79.9,117z M74,114l0,6l1.3,0c1.6,0,2.8-1,2.8-3 c0-1.9-1.2-3-2.8-3H74zM90.7,117.9c0,2.3-1.3,3.7-3.7,3.7c-2.4,0-3.7-1.5-3.7-3.7l0-5.4l1.7,0l0,5.3c0,1.3,0.8,2.1,2,2.1c1.2,0,2-0.8,2-2.1 l0-5.3l1.7,0L90.7,117.9zM94.1,117c0-2.8,2-4.7,4.9-4.7c1.4,0,2.4,0.4,3.2,1l-0.9,1.4c-0.6-0.4-1.3-0.7-2.3-0.7c-1.7,0-3,1.2-3,3c0,1.8,1.3,3,3,3 c1,0,1.7-0.4,2.3-0.7l0.9,1.4c-0.8,0.6-1.8,1-3.2,1C96.2,121.7,94.1,119.8,94.1,117zM111.4,114H109l0,7.4l-1.6,0l0-7.4l-2.5,0v-1.5l6.5,0V114zM123.4,117c0,2.8-2,4.7-4.7,4.7c-2.7,0-4.7-1.9-4.7-4.7c0-2.8,2-4.7,4.7-4.7C121.3,112.3,123.4,114.2,123.4,117z M115.8,117c0,1.8,1.2,3,2.9,3c1.7,0,2.9-1.2,2.9-3c0-1.8-1.2-3-2.9-3C117,114,115.8,115.2,115.8,117zM129,117.9h-0.6v3.6h-1.6l0-9l3.3,0c1.8,0,2.9,1.1,2.9,2.7c0,1.3-0.8,2.3-2.1,2.6l2.7,3.7h-2.1L129,117.9z M128.4,116.5 h1.4c0.9,0,1.4-0.4,1.4-1.2c0-0.7-0.4-1.2-1.4-1.2h-1.4L128.4,116.5z';

// Nordic logo along the right edge, rotated to read bottom-to-top like the
// silkscreen: mark first, wordmark to its right, URL beneath both.
function nordicLogo(): string {
  const mark = NORDIC_MARK.map((p) => `<path fill-opacity="${p.opacity}" d="${p.d}"/>`).join('');
  return (
    `<g class="logo" transform="translate(131.3 42.6) rotate(-90) scale(0.0567) translate(-30.9 0)">` +
    mark +
    `<path transform="translate(118.4 -69.75)" d="${NORDIC_WORDMARK}"/></g>` +
    `<text class="logo-url" textLength="16.2" lengthAdjust="spacingAndGlyphs" transform="translate(136.2 43.2) rotate(-90)">www.nordicsemi.com</text>` +
    `<text class="title" transform="translate(133.6 62.2) rotate(-90)">nRF52840-DK</text>`
  );
}

class Nrf52840DkElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  get pinInfo() {
    return PINS_NRF52840_DK;
  }

  private render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        text { fill: #f4f4f4; font-family: Arial, Helvetica, sans-serif; }
        .pin { font-size: 1.8px; }
        .side { font-size: 1.6px; }
        .silk { font-size: 1.5px; text-anchor: middle; }
        .title { font-size: 2.3px; font-weight: bold; }
        .logo { fill: #f4f4f4; }
        .logo-url { font-size: 1.4px; }
        .male { fill: #565656; }
        .male-pin { fill: #aaa; }
        .pcb { fill: #1d4e89; fill-rule: evenodd; }
        .pth { fill: none; stroke: #d9b45a; stroke-width: 0.23; }
        .tin { fill: #c8ccd2; }
        .gold { fill: #d9b45a; }
        .plastic { fill: #232323; }
        .cavity { fill: #111; }
        .shell { fill: #c3c7cd; stroke: #8f959d; stroke-width: 0.12; }
        .shell-top { fill: #b3b8bf; }
        .switch-body { fill: #3a3a3a; }
        .knob { fill: #ececec; }
        .knob-dark { fill: #2c2c2c; }
        .chip { fill: #262626; }
        .dot { fill: #6b6b6b; }
        .cap { fill: #151515; }
        .led { fill: #f1ead2; }
        .jst { fill: #ecebe6; stroke: #bdbbb2; stroke-width: 0.1; }
        .jst-cavity { fill: #cfcdc4; }
      </style>
      <svg width="${BOARD_W}mm" height="${BOARD_H}mm" viewBox="0 0 ${BOARD_W} ${BOARD_H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${PINS_FEMALE_PATTERN}
        </defs>

        <path class="pcb" d="${PCB_PATH}"/>

        ${throughHoles(TOP_HOLES, [1.27, 3.81])}
        ${throughHoles(BOTTOM_HOLES, [59.69, 62.23])}
        ${[...TOP_ROWS, ...BOTTOM_ROWS].map((row) => femaleHeader(row[0].x, row[0].y, row.length, 1)).join('')}
        ${femaleHeader(SIDE_X, SIDE_Y, 2, SIDE_ROWS.length)}
        ${maleHeaders()}
        ${usbConnectors()}
        ${slideSwitches()}
        ${otherConnectors()}

        ${chip(111.62, 22.71, 118.64, 29.81, 112.42, 23.51)}
        ${chip(34.9, 30, 41.91, 37.02, 35.7, 30.8)}
        ${chip(110.88, 37.65, 116.98, 42.75, 116.18, 41.95)}

        ${LEDS.map((l) => led(l.x, l.y)).join('')}
        ${box(37.64, 40.57, 38.84, 41.27, 'led')}
        ${BUTTONS.map((b) => button(b.x, b.y)).join('')}

        ${topLabels()}
        ${bottomLabels()}
        ${sideLabels()}
        ${LEDS.map((l) => `<text class="silk" x="${l.x + 0.95}" y="${l.y - 0.5}">${l.label}</text>`).join('')}
        ${BUTTONS.map((b) => `<text class="silk" x="${b.x + 3.25}" y="${b.y - 0.6}">${b.label}</text>`).join('')}
        ${nordicLogo()}
      </svg>
    `;
  }
}

if (!customElements.get('velxio-nrf52840-dk')) {
  customElements.define('velxio-nrf52840-dk', Nrf52840DkElement);
}
