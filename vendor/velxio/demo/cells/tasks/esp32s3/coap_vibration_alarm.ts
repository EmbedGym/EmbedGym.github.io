import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { motion, setMotion } from '../../decor/motion';
import { runServer, server, setServerLink, type ServerMessage } from '../../decor/server';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// Board-specific names.
const IMU = 'IMU1';
const LED = 'L1';
const LED_WIRES = ['w-10-R1', 'w-R1-L1'];
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

type Led = HTMLElement & { value: boolean };

// The board joins WiFi and GETs its threshold (1.30 g) from coap.iot.test. At
// rest the MPU6050 reads 1.00 g. A shake adds 1 g along X: |a| = 1.41 g, over
// the threshold, so the board POSTs an alarm (CON) and lights the LED once it
// is answered 2.01. The shake stops, |a| drops back to 1.00 g and the LED goes out. The
// loop ends with a reset, which clears the threshold.
const DURATION = 6000;
const LINKED = 150;
const THRESHOLD_AT = 1700;
const SHAKE_FROM = 2400;
const SHAKE_TO = 4600;
const RESET_FADE = 5700;
const SAMPLE_MS = 100;
const THRESHOLD = 1.3;
const SHAKEN = Math.SQRT2;
// The first sample that sees the shake, and the first that sees it stop.
const ALARM_AT = SHAKE_FROM + SAMPLE_MS;
const CLEAR_AT = SHAKE_TO + SAMPLE_MS;
const POST_ACK = ALARM_AT + 600 + 50 + 600;

const PRINTS: Print[] = [
  { t: THRESHOLD_AT + 2, text: 'CONFIG threshold 1.300' },
  { t: POST_ACK + 2, text: 'ALARM {"magnitude_g":1.41,"threshold_g":1.30}' },
];
const COAP: ServerMessage[] = [
  { t: 750, text: 'GET /config', dir: 'to' },
  { t: THRESHOLD_AT - 600, text: 'threshold 1.30', dir: 'from' },
  { t: ALARM_AT + 600, text: 'POST /alarms', dir: 'to' },
  { t: POST_ACK - 600, text: '2.01 Created', dir: 'from' },
];

const FONT = 40;
const SERIAL = { x: -100, y: 372, w: 1140, h: 153 };
const READING = { x: 250, y: -30, w: 470, h: 136 };
const SCALE_MAX = 2;
const BAR = { x: 14, y: 66, w: 442 };
const REACH = 360;
const COAP_BOX = { x: 372 + REACH, y: 217 };

// The magnitude the last 100 ms sample read.
const magnitudeAt = (t: number) => {
  const sampled = Math.floor(t / SAMPLE_MS) * SAMPLE_MS;
  return sampled >= ALARM_AT && sampled < CLEAR_AT ? SHAKEN : 1;
};

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-cvae-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-cvae-text { position: absolute; font: 700 40px/48px var(--mono); white-space: nowrap; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      <div class="c-cvae-panel" style="left:${READING.x}px;top:${READING.y}px;width:${READING.w}px;height:${READING.h}px">
        <div class="c-cvae-text" style="left:14px;top:8px;color:var(--muted);font-family:var(--sans)">IMU1 |a|</div>
        <div class="c-cvae-text c-cvae-value" style="right:14px;top:8px;color:var(--ink)"></div>
        <div style="position:absolute;left:${BAR.x}px;top:${BAR.y}px;width:${BAR.w}px;height:14px;border-radius:7px;background:#e2e8f0"></div>
        <div class="c-cvae-fill" style="position:absolute;left:${BAR.x}px;top:${BAR.y}px;height:14px;border-radius:7px"></div>
        <div class="c-cvae-mark" style="position:absolute;top:${BAR.y - 8}px;left:${BAR.x + (BAR.w * THRESHOLD) / SCALE_MAX - 2}px;width:4px;height:30px;background:var(--ink)"></div>
        <div class="c-cvae-text c-cvae-limit" style="top:${BAR.y + 22}px;font-family:var(--sans)"></div>
      </div>
      ${motion('shake')}
      ${server('coap', { ...COAP_BOX, kind: 'web', label: 'coap.iot.test', fontSize: FONT, side: 'left', reach: REACH })}`,
    bounds: [SERIAL.x, READING.y - 4, COAP_BOX.x + 306, SERIAL.y + SERIAL.h],
  },
  run(t, view) {
    const linked = t >= LINKED && t < RESET_FADE;
    setServerLink(view, 'coap', linked);
    runServer(view, 'coap', t, COAP);

    const reset = clamp((t - RESET_FADE) / 300);
    const cleared = reset >= 0.5;
    const known = t >= THRESHOLD_AT && !cleared;

    const shake = Math.min(clamp((t - SHAKE_FROM) / 100), 1 - clamp((t - SHAKE_TO) / 100));
    setMotion(view, 'shake', view.box(IMU), shake, { sides: 'right', scale: 1.5 });
    // The bus is read every 100 ms, too often to pulse, so it glows steadily.
    I2C_WIRES.forEach((id) => view.glowWire(id, 0.5));

    const magnitude = magnitudeAt(t);
    const over = known && magnitude > THRESHOLD;
    view.q<HTMLElement>('.c-cvae-value').textContent = `${magnitude.toFixed(2)} g`;
    const fill = view.q<HTMLElement>('.c-cvae-fill');
    fill.style.width = `${(BAR.w * magnitude) / SCALE_MAX}px`;
    fill.style.background = over ? 'var(--accent)' : '#94a3b8';
    // The threshold marker exists only once the GET has answered; the reset crossfades it out.
    const markOpacity = String(known ? (reset === 0 ? 1 : 1 - 2 * reset) : 0);
    view.q<HTMLElement>('.c-cvae-mark').style.opacity = markOpacity;
    const limit = view.q<HTMLElement>('.c-cvae-limit');
    limit.textContent = known ? 'threshold 1.30 g' : 'no threshold';
    limit.style.left = known ? `${BAR.x + (BAR.w * THRESHOLD) / SCALE_MAX - 150}px` : `${BAR.x}px`;
    limit.style.color = known ? 'var(--ink)' : 'var(--muted)';
    limit.style.opacity = String(reset === 0 ? 1 : Math.abs(1 - 2 * reset));

    // post_alarm() blocks on the CON reply before GPIO10 is set.
    const lit = over && t >= POST_ACK;
    view.part<Led>(LED).value = lit;
    LED_WIRES.forEach((id) => view.glowWire(id, lit ? 1 : 0));

    showSerial(view, 'out', t, PRINTS, { fadeFrom: RESET_FADE });
  },
};

export default cell;
