import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { runServer, server, setServerLink, type ServerMessage } from '../../decor/server';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// Board-specific names.
const RELAY = 'RLY1';
const RELAY_WIRE = 'w-21-IN';

type Relay = HTMLElement & { energized: boolean };

// The board joins WiFi, asks ntp.iot.test for the time (01:29:50.5 UTC) and
// GETs its schedule (every 5 s): UTC+5:30 and four windows, one of them 07:00:00–07:00:35
// local. The clock runs 12× fast: the relay switches on at 07:00:00 and off at
// 07:00:35. The loop ends with a reset, which clears clock and schedule.
const DURATION = 6000;
const LINKED = 150;
const SYNC = 1700;
const SCHEDULE = 1850;
const RESET_FADE = 5700;
const SPEED = 12;
const SYNC_UTC = 1 * 3600 + 29 * 60 + 50.5;
const OFFSET = 5.5 * 3600;
const ON_LOCAL = 7 * 3600;
const OFF_LOCAL = 7 * 3600 + 35;
const atLocal = (s: number) => SYNC + ((s - OFFSET - SYNC_UTC) * 1000) / SPEED;
const ON_AT = atLocal(ON_LOCAL);
const OFF_AT = atLocal(OFF_LOCAL);

const PRINTS: Print[] = [
  { t: SYNC + 2, text: 'TIME SYNCED' },
  { t: ON_AT + 2, text: 'RELAY ON' },
  { t: OFF_AT + 2, text: 'RELAY OFF' },
];
const NTP: ServerMessage[] = [
  { t: 750, text: 'time?', dir: 'to' },
  { t: SYNC - 600, text: '01:29:50 UTC', dir: 'from' },
];
const HTTP: ServerMessage[] = [
  { t: 900, text: 'GET /schedule', dir: 'to' },
  { t: SCHEDULE - 600, text: '+5:30, 4 windows', dir: 'from' },
];

const hms = (s: number) => {
  const two = (n: number) => String(n).padStart(2, '0');
  const w = Math.floor(s) % 86400;
  return `${two(Math.floor(w / 3600))}:${two(Math.floor(w / 60) % 60)}:${two(w % 60)}`;
};

const FONT = 40;
const SERIAL = { x: -60, y: 372, w: 320, h: 153 };
const CLOCK = { x: 420, y: -10, w: 460, h: 120 };
const REACH = 410;
const NTP_BOX = { x: 312 + REACH, y: 130 };
const HTTP_BOX = { x: 312 + REACH, y: 250 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-nsre-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-nsre-row { position: absolute; left: 14px; font: 700 40px/48px var(--mono); white-space: nowrap; }
        .c-nsre-relay {
          position: absolute; padding: 0 8px; border-radius: 8px; white-space: nowrap;
          font: 700 40px/50px var(--sans); color: #fff;
        }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      <div class="c-nsre-panel" style="left:${CLOCK.x}px;top:${CLOCK.y}px;width:${CLOCK.w}px;height:${CLOCK.h}px">
        <div class="c-nsre-row c-nsre-clock" style="top:10px;color:var(--ink)"></div>
        <div style="position:absolute;right:14px;top:10px;font:700 40px/48px var(--sans);color:var(--muted)">×12</div>
        <div class="c-nsre-row c-nsre-sched" style="top:60px"></div>
      </div>
      <div class="c-nsre-relay"></div>
      ${server('ntp', { ...NTP_BOX, kind: 'clock', label: 'ntp.iot.test', fontSize: FONT, side: 'left', reach: REACH })}
      <div style="position:absolute;left:${HTTP_BOX.x - 230}px;top:${HTTP_BOX.y + 90}px;font:600 40px/48px var(--sans);color:var(--muted);white-space:nowrap">every 5 s</div>
      ${server('http', { ...HTTP_BOX, kind: 'web', label: 'api.iot.test', fontSize: FONT, side: 'left', reach: REACH })}`,
    bounds: [SERIAL.x, CLOCK.y - 4, NTP_BOX.x + 284, SERIAL.y + SERIAL.h],
  },
  run(t, view) {
    const linked = t >= LINKED && t < RESET_FADE;
    setServerLink(view, 'ntp', linked);
    setServerLink(view, 'http', linked);
    runServer(view, 'ntp', t, NTP);
    runServer(view, 'http', t, HTTP);

    // The reset crossfades the set values back to the placeholders t=0 shows.
    const reset = clamp((t - RESET_FADE) / 300);
    const cleared = reset >= 0.5;
    const opacity = String(reset === 0 ? 1 : Math.abs(1 - 2 * reset));

    // NTP gives UTC; the schedule brings the +5:30 offset, so local time shows from then on.
    const utc = SYNC_UTC + ((t - SYNC) * SPEED) / 1000;
    const synced = t >= SYNC && !cleared;
    const scheduled = t >= SCHEDULE && !cleared;
    const clock = view.q<HTMLElement>('.c-nsre-clock');
    clock.textContent = !synced ? '--:--:--' : scheduled ? `local ${hms(utc + OFFSET)}` : `UTC   ${hms(utc)}`;
    clock.style.opacity = opacity;
    const sched = view.q<HTMLElement>('.c-nsre-sched');
    sched.textContent = scheduled ? '07:00:00–07:00:35' : 'no schedule';
    sched.style.color = scheduled ? 'var(--accent)' : 'var(--muted)';
    sched.style.opacity = opacity;

    const on = t >= ON_AT && t < OFF_AT;
    view.part<Relay>(RELAY).energized = on;
    view.glowWire(RELAY_WIRE, on ? 1 : 0);
    const relay = view.box(RELAY);
    const tag = view.q<HTMLElement>('.c-nsre-relay');
    tag.style.left = `${relay.x}px`;
    tag.style.top = `${relay.y + relay.h + 10}px`;
    tag.textContent = on ? 'relay ON' : 'relay OFF';
    tag.style.background = on ? 'var(--accent)' : '#94a3b8';

    showSerial(view, 'out', t, PRINTS, { fadeFrom: RESET_FADE });
  },
};

export default cell;
