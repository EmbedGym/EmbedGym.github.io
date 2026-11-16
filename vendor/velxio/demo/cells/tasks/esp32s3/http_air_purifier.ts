import type { Cell } from '../../cell';
import { flame } from '../../decor/flame';
import { puffs } from '../../decor/puffs';
import { runServer, server, serverSize, setServerLink, type ServerMessage } from '../../decor/server';
import { INLET, candleSvg, runCandle } from '../mega/air_quality_read';

type Relay = HTMLElement & { energized: boolean };

// The board reads PM2.5 once a second and switches the purifier relay with a ±5 band round the
// setpoint: on above 55, off below 45. It GETs the setpoint (50) every 10 s, so this 6 s loop shows
// one, in its first pass; that pass then POSTs its reading and the purifier state, and every third
// pass after it POSTs again. The candle's smoke reaches the inlet for the 2100 ms reading, which
// turns the purifier on; 47 is inside the band, so it stays on until 42 turns it off, as it was at
// the loop's start.
export const DURATION = 6000;
const READS = [100, 1100, 2100, 3100, 4100, 5100];
const PM25 = [12, 12, 300, 300, 47, 42];
const ON_AT = READS[2];
const OFF_AT = READS[5];
const purifierOn = (t: number) => t >= ON_AT && t < OFF_AT;
const latest = (t: number) => READS.findLastIndex((r) => r <= t);
// Short chips, so the GET, its reply and the first POST all fit the first pass: each holds the lane
// for 460 ms. Each leaves once the one before has faded. The POSTs' short 200 replies are left out
// to keep the lane clear.
const TIMING = { flight: 300, linger: 80, fade: 80 };
const HOLD = TIMING.flight + TIMING.linger + TIMING.fade;
const GET_AT = READS[0] + TIMING.flight;
const SETPOINT_AT = GET_AT + TIMING.linger + TIMING.fade;
const post = (i: number, leave: number): ServerMessage => ({ t: leave + TIMING.flight, text: `POST ${PM25[i]} ${purifierOn(READS[i]) ? 'on' : 'off'}`, dir: 'to' });
const MESSAGES: ServerMessage[] = [
  { t: GET_AT, text: 'GET setpoint', dir: 'to' },
  { t: SETPOINT_AT, text: 'setpoint 50', dir: 'from' },
  post(0, SETPOINT_AT + HOLD),
  post(3, READS[3]),
];

// The relay's load, which circuit.ts leaves out: the purifier's fan, left of its state.
const fanSvg = `
  <svg viewBox="0 0 60 60" width="60" height="60">
    <rect x="2" y="0" width="54" height="54" rx="8" fill="#2f3640" />
    <circle cx="29" cy="27" r="23" fill="#d7dde4" />
    <g data-blades style="transform-origin:29px 27px" fill="#4b5563">
      <path d="M 29 27 C 26 16 31 7 39 9 C 41 17 36 24 29 27 Z" />
      <path d="M 29 27 C 26 16 31 7 39 9 C 41 17 36 24 29 27 Z" transform="rotate(120 29 27)" />
      <path d="M 29 27 C 26 16 31 7 39 9 C 41 17 36 24 29 27 Z" transform="rotate(240 29 27)" />
    </g>
    <circle cx="29" cy="27" r="5" fill="#2f3640" />
  </svg>`;
// Spin angle, the integral of a speed that ramps up at switch-on and down at switch-off. The ramps
// cancel, so the total is SPIN x the on time: a whole number of 120° blade turns keeps the seam still.
const RAMP = 500;
const SPIN = (120 * 10) / (OFF_AT - ON_AT);
function fanAngle(t: number) {
  if (t < ON_AT) return 0;
  const up = Math.min(t - ON_AT, RAMP);
  let angle = (SPIN * up * up) / (2 * RAMP) + SPIN * Math.max(0, Math.min(t, OFF_AT) - ON_AT - RAMP);
  if (t > OFF_AT) {
    const d = Math.min(t - OFF_AT, RAMP);
    angle += SPIN * (d - (d * d) / (2 * RAMP));
  }
  return angle;
}

const FONT = 34;
const LABEL = 'api.iot.test';
const SERVER_SIZE = serverSize(LABEL, FONT);
// The lane runs to the WiFi access point (W1, right edge at 364, middle at 71), as long as the longest chip.
const REACH = 270;
const SERVER = { x: 378 + REACH, y: 71 - SERVER_SIZE.h / 2 };
// Right of the dust sensor, its wick lower than the inlet.
const CANDLE = { x: 325, y: 270 };
const WICK = { x: CANDLE.x + 17, y: CANDLE.y + 30 };
const RELAY = { x: 171, y: -20 };
const FAN_BOX = { x: RELAY.x, y: RELAY.y - 72 };
const BUS = ['w-38-SDA', 'w-39-SCL'];
// What the board knows, in the free space right of the candle.
const READOUT = { x: 400, y: 230 };

const httpAirPurifierEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${server('api', { ...SERVER, kind: 'web', label: LABEL, fontSize: FONT, side: 'left', reach: REACH })}
      <div style="position:absolute;left:${CANDLE.x}px;top:${CANDLE.y}px">${candleSvg}</div>
      <div style="position:absolute;left:${WICK.x}px;top:${WICK.y}px">${flame('candle')}</div>
      ${puffs('smoke', 36, 'smoke')}
      <div style="position:absolute;left:${FAN_BOX.x}px;top:${FAN_BOX.y}px">${fanSvg}</div>
      <div data-purifier style="position:absolute;left:${FAN_BOX.x + 70}px;top:${FAN_BOX.y + 5}px;padding:0 10px;border-radius:8px;white-space:nowrap;font:700 ${FONT}px/44px var(--sans);color:#fff"></div>
      <div style="position:absolute;left:${READOUT.x}px;top:${READOUT.y}px;padding:6px 14px;border:1.6px solid #cfd6df;border-radius:10px;background:#f8fafc;font:600 ${FONT}px/44px var(--mono);color:#1e293b;white-space:pre"><div data-pm></div><div data-sp>setpoint 50</div></div>`,
    bounds: [-20, FAN_BOX.y, SERVER.x + SERVER_SIZE.w, 384],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    const box = view.box('AIR1');
    runCandle(view, t, WICK, { x: box.x + INLET.dx, y: box.y + INLET.dy });
    setServerLink(view, 'api', true);
    runServer(view, 'api', t, MESSAGES, TIMING);
    const i = latest(t);
    const pm = view.q<HTMLElement>('[data-pm]');
    pm.textContent = `PM2.5   ${i === -1 ? PM25[PM25.length - 1] : PM25[i]}`;
    pm.style.color = i !== -1 && t - READS[i] < 400 ? 'var(--accent)' : '#1e293b';
    // The setpoint reply lands at the board one flight after it leaves the server.
    view.q<HTMLElement>('[data-sp]').style.color = t >= SETPOINT_AT + TIMING.flight && t < SETPOINT_AT + TIMING.flight + 400 ? 'var(--accent)' : '#1e293b';
    const on = purifierOn(t);
    view.part<Relay>('RLY1').energized = on;
    view.glowWire('w-21-IN', on ? 1 : 0);
    const label = view.q<HTMLElement>('[data-purifier]');
    label.textContent = on ? 'purifier ON' : 'purifier OFF';
    label.style.background = on ? 'var(--accent)' : '#94a3b8';
    view.q<SVGGElement>('[data-blades]').style.transform = `rotate(${fanAngle(t)}deg)`;
  },
};

export default httpAirPurifierEsp32s3;
