import type { Cell } from '../../cell';
import { phone, phoneHeight, phoneWidth, setPhoneLink, setPhoneReadout } from '../../decor/phone';
import { airLane, runAir, FLIGHT, type Packet } from './ble_uart_console';

type Relay = HTMLElement & { energized: boolean };

// The board is the central: it has connected to BLE-Tag (drawn as a phone running a sensor-tag app)
// and subscribed to its Temperature. The tag notifies once a second; the board switches the fan
// relay on above 28.00 °C and off below 26.00 °C, holding it in between. Over the loop the tag reads
// the test's warm 27.5, hot 30.0, cool 26.5 (the fan stays on), cold 24.0 (off) and warm 27.5 (stays
// off). Scanning, connecting and subscribing happen before the loop, so it starts connected.
const DURATION = 6000;
const NOTIFIES = [250, 1250, 2250, 3250, 4250, 5250];
const TEMPS = [27.5, 30.0, 30.0, 26.5, 24.0, 27.5];
const ON_ABOVE = 28;
const OFF_BELOW = 26;
const PACKETS: Packet[] = [...NOTIFIES, NOTIFIES[NOTIFIES.length - 1] - DURATION].map((t) => ({ t, dir: 'up' }));

// The fan's state after each notification lands, from the loop's start (off, as at its end).
const FAN: boolean[] = [];
TEMPS.reduce((on, temp) => {
  const next = temp > ON_ABOVE ? true : temp < OFF_BELOW ? false : on;
  FAN.push(next);
  return next;
}, false);

// Cell coordinates: the relay left of the board's top; the radio (B1) below it; the tag's phone left of them.
const FONT = 34;
const RELAY = { x: -140, y: -46 };
const B1 = { x: -150, y: 70, w: 88, h: 70 };
const PHONE_W = phoneWidth(12, FONT);
const PHONE_H = phoneHeight({ fontSize: FONT, status: true, readout: 'Temperature', rows: 0 });
const PHONE = { x: B1.x - 60 - PHONE_W, y: Math.round(B1.y + B1.h / 2 - PHONE_H / 2), w: PHONE_W, h: PHONE_H };
// The relay's load, which circuit.ts leaves out: a fan above the relay, its state beside it.
const FAN_BOX = { x: RELAY.x, y: RELAY.y - 72 };
const FAN_ON_AT = NOTIFIES[FAN.indexOf(true)] + FLIGHT;
const FAN_OFF_AT = NOTIFIES[FAN.lastIndexOf(true) + 1] + FLIGHT;
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
const SPIN = (120 * 12) / (FAN_OFF_AT - FAN_ON_AT);
function fanAngle(t: number) {
  if (t < FAN_ON_AT) return 0;
  const up = Math.min(t - FAN_ON_AT, RAMP);
  let angle = (SPIN * up * up) / (2 * RAMP) + SPIN * Math.max(0, Math.min(t, FAN_OFF_AT) - FAN_ON_AT - RAMP);
  if (t > FAN_OFF_AT) {
    const d = Math.min(t - FAN_OFF_AT, RAMP);
    angle += SPIN * (d - (d * d) / (2 * RAMP));
  }
  return angle;
}

const bleSensorTagFanNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('tag', { ...PHONE, fontSize: FONT, title: 'BLE-Tag', status: true, readout: 'Temperature', maxRows: 0 })}
      ${airLane('air', { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 })}
      <div style="position:absolute;left:${FAN_BOX.x}px;top:${FAN_BOX.y}px">${fanSvg}</div>
      <div data-fan style="position:absolute;left:${FAN_BOX.x + 70}px;top:${FAN_BOX.y + 5}px;padding:0 10px;border-radius:8px;white-space:nowrap;font:700 ${FONT}px/44px var(--sans);color:#fff"></div>`,
    // Cropped just right of the header pins the circuit uses; the rest of the board runs off the card.
    bounds: [PHONE.x, FAN_BOX.y, 170, 248],
  },
  run(t, view) {
    setPhoneLink(view, 'tag', 'connected');
    runAir(view, 'air', t, PACKETS);
    // The newest notification that has landed; before the first, the previous loop's last.
    const i = NOTIFIES.findLastIndex((n) => n + FLIGHT <= t);
    const k = i === -1 ? NOTIFIES.length - 1 : i;
    const since = i === -1 ? t + DURATION - NOTIFIES[k] - FLIGHT : t - NOTIFIES[k] - FLIGHT;
    setPhoneReadout(view, 'tag', `${TEMPS[k].toFixed(1)} °C`, 1 - since / 400);
    const on = i === -1 ? FAN[FAN.length - 1] : FAN[i];
    view.part<Relay>('RLY1').energized = on;
    view.glowWire('w-P1.15-IN', on ? 1 : 0);
    const label = view.q<HTMLElement>('[data-fan]');
    label.textContent = on ? 'fan ON' : 'fan OFF';
    label.style.background = on ? 'var(--accent)' : '#94a3b8';
    view.q<SVGGElement>('[data-blades]').style.transform = `rotate(${fanAngle(t)}deg)`;
  },
};

export default bleSensorTagFanNrf52840;
