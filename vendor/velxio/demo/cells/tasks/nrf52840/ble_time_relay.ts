import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { phone, phoneWidth, runPhone, setPhoneLink, type PhoneMessage } from '../../decor/phone';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// Board-specific names.
const RELAY = 'RLY1';
const RELAY_WIRE = 'w-P1.15-IN';

type Relay = HTMLElement & { energized: boolean };

// A phone connects to BLE-Timer, writes the Current Time (Friday 07:03:57),
// then the schedule: on 06:58, off 07:04, Monday to Friday. Only with both
// set does the relay switch on; when the clock reaches 07:04:00 it switches
// off. The loop ends with a reset, which clears clock and schedule.
const DURATION = 6000;
const CONNECT = 200;
const TIME_WRITE = 700;
const SCHEDULE_WRITE = 1700;
const RESET_FADE = 5700;
const SET_SECONDS = 7 * 3600 + 3 * 60 + 57;
const OFF_SECONDS = 7 * 3600 + 4 * 60;
const OFF_AT = TIME_WRITE + (OFF_SECONDS - SET_SECONDS) * 1000;

const PRINTS: Print[] = [
  { t: 60, text: 'BLE-Timer advertising' },
  { t: CONNECT, text: 'Connected' },
  { t: TIME_WRITE + 2, text: 'Clock set: 2026-10-30 07:03:57 dow 5' },
  { t: SCHEDULE_WRITE + 2, text: 'Schedule set: on 06:58 off 07:04 mask 0x1f' },
];
const CHAT: PhoneMessage[] = [
  { t: TIME_WRITE, text: 'Fri 07:03:57', from: 'out' },
  { t: SCHEDULE_WRITE, text: '06:58–07:04', from: 'out' },
  { t: SCHEDULE_WRITE + 1, text: 'Mon–Fri', from: 'out' },
];

const clockText = (t: number) => {
  const s = SET_SECONDS + Math.floor((t - TIME_WRITE) / 1000);
  const two = (n: number) => String(n).padStart(2, '0');
  return `Fri ${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
};
const relayOn = (t: number) => t >= SCHEDULE_WRITE + 2 && t < OFF_AT;

const FONT = 26;
const PHONE = { x: -560, y: 4, w: phoneWidth(12, FONT), h: 230 };
const SERIAL = { x: -330, y: 10, w: 274, h: 186 };
const CLOCK = { x: -470, y: -84, w: 310, h: 84 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-btrn-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
                .c-btrn-clock { position: absolute; left: 92px; top: 6px; font: 700 28px var(--mono); color: var(--ink); white-space: nowrap; }
        .c-btrn-relay {
          position: absolute; padding: 0 8px; border-radius: 8px; white-space: nowrap;
          font: 700 26px/34px var(--sans); color: #fff;
        }
        .c-btrn-sched { position: absolute; left: 12px; top: 42px; font: 600 26px var(--mono); color: var(--accent); white-space: nowrap; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: 26 })}
      <div class="c-btrn-panel" style="left:${CLOCK.x}px;top:${CLOCK.y}px;width:${CLOCK.w}px;height:${CLOCK.h}px">
        <div style="position:absolute;left:12px;top:8px;font:600 26px var(--sans);color:var(--muted)">clock</div>
        <div class="c-btrn-clock"></div>
        <div class="c-btrn-sched"></div>
      </div>
      <div class="c-btrn-relay"></div>
      ${phone('phone', { ...PHONE, fontSize: FONT, title: 'BLE-Timer', maxRows: 3 })}`,
    bounds: [PHONE.x, CLOCK.y - 4, SERIAL.x + SERIAL.w, PHONE.y + PHONE.h],
  },
  run(t, view) {
    const connected = t >= CONNECT && t < RESET_FADE;
    setPhoneLink(view, 'phone', connected);
    runPhone(view, 'phone', t, CHAT, RESET_FADE);

    // The board's clock and schedule exist only once written; the reset clears both.
    // The reset crossfades the set values back to the placeholders t=0 shows.
    const reset = clamp((t - RESET_FADE) / 300);
    const cleared = reset >= 0.5;
    const opacity = String(reset === 0 ? 1 : Math.abs(1 - 2 * reset));
    const clock = view.q<HTMLElement>('.c-btrn-clock');
    const clockSet = t >= TIME_WRITE && !cleared;
    clock.textContent = clockSet ? clockText(t) : '--:--:--';
    clock.style.opacity = opacity;
    const sched = view.q<HTMLElement>('.c-btrn-sched');
    const schedSet = t >= SCHEDULE_WRITE && !cleared;
    sched.textContent = schedSet ? '06:58–07:04 M–F' : 'no schedule';
    sched.style.color = schedSet ? 'var(--accent)' : 'var(--muted)';
    sched.style.opacity = opacity;

    const on = relayOn(t);
    view.part<Relay>(RELAY).energized = on;
    view.glowWire(RELAY_WIRE, on ? 1 : 0);
    const relay = view.box(RELAY);
    const tag = view.q<HTMLElement>('.c-btrn-relay');
    tag.style.left = `${relay.x - 10}px`;
    tag.style.top = `${relay.y - 42}px`;
    tag.textContent = on ? 'relay ON' : 'relay OFF';
    tag.style.background = on ? 'var(--accent)' : '#94a3b8';

    showSerial(view, 'out', t, PRINTS, { fadeFrom: RESET_FADE });
  },
};

export default cell;
