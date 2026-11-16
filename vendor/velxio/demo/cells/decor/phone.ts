import { clamp, easeOutCubic } from '../anim';
import { finger, tapFinger } from './finger';
import { BLUE, BLUE_EDGE, FACE, GREEN, MUTED, PHONE_BODY, PHONE_RULE, PHONE_SCREEN, SCANNING, TEXT, type DecorSample, type DecorView } from './common';

/** A chat message: `out` is sent by the phone, `in` is received. */
export type PhoneMessage = { t: number; text: string; from: 'out' | 'in' };

/** The app's link to the device: idle, scanning for it, or connected. */
export type PhoneLink = 'idle' | 'scanning' | 'connected';

const BEZEL = 5;
const NOTCH_H = 22;
const APP_HEAD_H = 32;
const SCREEN_PAD = 4;
/** Room under the content for the home indicator. */
const HOME_H = 14;
const BUBBLE_PAD = 5;
const GAP = 4;
const lineH = (fontSize: number) => Math.round(fontSize * 1.3);
const statusH = (f: number) => lineH(f) + 4;
const readoutH = (f: number, note?: boolean) => lineH(f) + lineH(1.5 * f) + (note ? lineH(f) : 0) + 12;
const buttonH = (f: number) => lineH(f) + 10;

type Parts = { fontSize: number; status?: boolean; readout?: string; note?: boolean; button?: string; buttons?: string[]; buttonsLabel?: string };

/** Which radio the app links over, shown in the notch. */
export type PhoneRadio = 'ble' | 'wifi';

/** The command buttons: `buttons` in two columns, or the one `button` across the screen. */
function buttonGrid(o: Parts): { labels: string[]; columns: number; rows: number } {
  const labels = o.buttons ?? (o.button ? [o.button] : []);
  const columns = labels.length > 1 ? 2 : 1;
  return { labels, columns, rows: Math.ceil(labels.length / columns) };
}
const labelH = (o: Parts) => (o.buttonsLabel && buttonGrid(o).rows ? lineH(o.fontSize) + GAP : 0);
const buttonsH = (o: Parts) => buttonGrid(o).rows * (buttonH(o.fontSize) + GAP) + labelH(o);

/**
 * The width a phone needs for a `chars`-character line in `fontSize` px text
 * (a message, a readout value, a button label) and for its app title.
 * Monospace text is 0.6 em a character; a short bold title is about 3.3 em.
 */
export function phoneWidth(chars: number, fontSize: number): number {
  return Math.ceil(Math.max(chars * 0.6 * fontSize + 2 * BUBBLE_PAD, 3.3 * fontSize) + 2 * (SCREEN_PAD + BEZEL) + 2);
}

/** The height a phone needs for its parts: the options passed to `phone`, and `rows` chat rows. */
export function phoneHeight(o: Parts & { rows: number }): number {
  const f = o.fontSize;
  return Math.ceil(chrome(o) + (o.rows ? o.rows * (lineH(f) + GAP) : 0) + 2 * BEZEL);
}

/** Height taken by everything but the chat rows. */
function chrome(o: Parts): number {
  const f = o.fontSize;
  return NOTCH_H + APP_HEAD_H + (o.status ? statusH(f) : 0) + (o.readout ? readoutH(f, o.note) + GAP : 0) + buttonsH(o) + HOME_H;
}

const bluetoothIcon = `
  <svg viewBox="0 0 12 20" width="9" height="15"><path d="M1.5 5.5 10 13.5 5.5 18V2l4.5 4.5L1.5 14.5" fill="none" stroke="${BLUE}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const wifiIcon = `
  <svg viewBox="0 0 20 16" width="15" height="12"><g fill="none" stroke="${BLUE}" stroke-width="2.4" stroke-linecap="round"><path d="M 2 6 A 11 11 0 0 1 18 6" /><path d="M 5 9.5 A 7 7 0 0 1 15 9.5" /></g><circle cx="10" cy="13" r="2" fill="${BLUE}" /></svg>`;

/**
 * A phone running a Bluetooth app titled `title`, the central of a BLE task,
 * its top-left at (x, y), `w` x `h` px, with `fontSize` px text. From the top:
 * - a status dot in the notch: grey idle, amber scanning, green connected
 *   (`setPhoneLink`); with `status`, also a line under the title saying so;
 * - with `readout`, a card titled `readout` (a characteristic, say) showing a
 *   value (`setPhoneReadout`), and with `note` a line under the value;
 * - a chat of the latest messages that fit whole, at most `maxRows`
 *   (`runPhone`); `maxRows: 0` leaves it out;
 * - with `button`, a command button so labelled, or with `buttons`, a grid of
 *   them two to a row; pressed with `setPhoneButton`; `buttonsLabel` titles
 *   them (the characteristic they write, say).
 * `radio: 'wifi'` makes it a WiFi app (a WiFi mark in the notch, not Bluetooth).
 */
export function phone(
  key: string,
  o: Parts & { x: number; y: number; w: number; h: number; title: string; maxRows?: number; radio?: PhoneRadio },
): string {
  const f = o.fontSize;
  const fit = Math.floor((o.h - 2 * BEZEL - chrome(o) + GAP) / (lineH(f) + GAP));
  const rows = Math.min(o.maxRows ?? 3, fit);
  const top = NOTCH_H + APP_HEAD_H;
  const status = o.status
    ? `<div data-phone-status style="height:${statusH(f)}px;display:flex;align-items:center;justify-content:center;font:600 ${f}px/1 var(--sans);color:${MUTED}"></div>`
    : '';
  const readout = o.readout
    ? `<div style="margin:${GAP}px ${SCREEN_PAD}px 0;height:${readoutH(f, o.note)}px;box-sizing:border-box;padding:4px 8px;border-radius:10px;background:${FACE};border:1.2px solid ${PHONE_RULE}">
        <div style="font:600 ${f}px/${lineH(f)}px var(--sans);color:${MUTED};white-space:nowrap">${o.readout}</div>
        <div data-phone-readout style="font:700 ${Math.round(1.5 * f)}px/${lineH(1.5 * f)}px var(--mono);color:${TEXT};white-space:nowrap"></div>
        ${o.note ? `<div data-phone-note style="font:600 ${f}px/${lineH(f)}px var(--sans);color:${MUTED};white-space:nowrap"></div>` : ''}
      </div>`
    : '';
  const chatBottom = HOME_H + buttonsH(o);
  const chat = rows
    ? `<div style="position:absolute;left:0;right:0;top:${top + (o.status ? statusH(f) : 0) + (o.readout ? readoutH(f, o.note) + GAP : 0)}px;bottom:${chatBottom}px;overflow:hidden">
        <div data-phone-list data-rows="${rows}" data-step="${lineH(f) + GAP}" data-font="${f}"
          style="position:absolute;left:${SCREEN_PAD}px;right:${SCREEN_PAD}px;bottom:0;display:flex;flex-direction:column;gap:${GAP}px"></div>
      </div>`
    : '';
  const grid = buttonGrid(o);
  const button = grid.rows
    ? `<div style="position:absolute;left:${SCREEN_PAD}px;right:${SCREEN_PAD}px;bottom:${HOME_H}px;display:grid;grid-template-columns:repeat(${grid.columns}, 1fr);gap:${GAP}px">
        ${o.buttonsLabel ? `<div style="grid-column:1 / -1;text-align:center;font:600 ${f}px/${lineH(f)}px var(--sans);color:${MUTED};white-space:nowrap">${o.buttonsLabel}</div>` : ''}
        ${grid.labels
          .map(
            (label) => `<div data-phone-button style="height:${buttonH(f)}px;box-sizing:border-box;border-radius:10px;display:flex;align-items:center;justify-content:center;
              font:700 ${f}px/1 var(--sans);white-space:nowrap;color:${FACE};background:${BLUE};border:1.5px solid ${BLUE_EDGE}">${label}</div>`,
          )
          .join('')}
      </div>`
    : '';
  return `
    <div data-phone="${key}" style="position:absolute;left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;box-sizing:border-box;padding:${BEZEL}px;border-radius:24px;background:${PHONE_BODY}">
      <div style="position:absolute;right:-3px;top:24%;width:3px;height:30px;border-radius:0 2px 2px 0;background:${PHONE_BODY}"></div>
      <div style="position:relative;height:100%;border-radius:19px;background:${PHONE_SCREEN};overflow:hidden">
        <div style="height:${NOTCH_H}px;padding:0 14px;display:flex;justify-content:space-between;align-items:center">
          ${o.radio === 'wifi' ? wifiIcon : bluetoothIcon}
          <span style="width:34px;height:9px;border-radius:5px;background:${PHONE_BODY}"></span>
          <span data-phone-dot style="flex:none;width:9px;height:9px;border-radius:50%;background:${MUTED}"></span>
        </div>
        <div style="height:${APP_HEAD_H}px;box-sizing:border-box;border-bottom:1px solid ${PHONE_RULE};display:flex;align-items:center;justify-content:center;font:700 ${f}px/1 var(--sans);color:${TEXT};white-space:nowrap">${o.title}</div>
        ${status}${readout}${chat}${button}
        <div style="position:absolute;left:50%;bottom:5px;width:36px;margin-left:-18px;height:4px;border-radius:2px;background:${PHONE_BODY}"></div>
      </div>
    </div>`;
}

function bubble(m: PhoneMessage, f: number): string {
  const out = m.from === 'out';
  const look = out
    ? `align-self:flex-end;border-radius:12px 12px 4px 12px;background:${BLUE};color:${FACE}`
    : `align-self:flex-start;border-radius:12px 12px 12px 4px;background:${PHONE_RULE};color:${TEXT}`;
  return `<div style="${look};padding:0 ${BUBBLE_PAD}px;white-space:nowrap;font:600 ${f}px/${lineH(f)}px var(--mono)">${m.text}</div>`;
}

/**
 * The chat on phone `key` at time `t`: the latest messages that fit, the newest
 * sliding in from below (`reveal: 'fade'` fades it in in place instead, so it is
 * never clipped); all fade out from `fadeFrom`.
 */
export function runPhone(view: DecorView, key: string, t: number, messages: PhoneMessage[], fadeFrom: number, reveal: 'slide' | 'fade' = 'slide') {
  const list = view.q<HTMLElement>(`[data-phone="${key}"] [data-phone-list]`);
  const f = Number(list.dataset.font);
  const done = messages.filter((m) => m.t <= t);
  list.innerHTML = done
    .slice(-Number(list.dataset.rows))
    .map((m) => bubble(m, f))
    .join('');
  const since = done.length ? t - done[done.length - 1].t : Infinity;
  if (reveal === 'slide') {
    list.style.transform = `translateY(${Number(list.dataset.step) * (1 - easeOutCubic(clamp(since / 180)))}px)`;
  } else if (reveal === 'fade') {
    list.style.transform = '';
    const newest = list.lastElementChild as HTMLElement | null;
    if (newest) newest.style.opacity = String(easeOutCubic(clamp(since / 180)));
  } else {
    throw new Error(`runPhone: unknown reveal ${reveal}`);
  }
  list.style.opacity = String(1 - clamp((t - fadeFrom) / 300));
}

const LINK_TEXT: Record<PhoneLink, string> = { idle: 'Disconnected', scanning: 'Scanning…', connected: 'Connected' };
const LINK_DOT: Record<PhoneLink, string> = { idle: MUTED, scanning: SCANNING, connected: GREEN };

/**
 * Sets phone `key`'s link: `true`/`false` for connected/idle, or a `PhoneLink`.
 * The status line, if the phone has one, says `text` or the state's name.
 */
export function setPhoneLink(view: DecorView, key: string, link: boolean | PhoneLink, text?: string) {
  const state: PhoneLink = link === true ? 'connected' : link === false ? 'idle' : link;
  view.q<HTMLElement>(`[data-phone="${key}"] [data-phone-dot]`).style.background = LINK_DOT[state];
  const status = view.qa<HTMLElement>(`[data-phone="${key}"] [data-phone-status]`)[0];
  if (status) {
    status.textContent = text ?? LINK_TEXT[state];
    status.style.color = state === 'connected' ? GREEN : MUTED;
  }
}

/**
 * Shows `value` in phone `key`'s readout card, highlighted for `fresh` (1 just
 * updated … 0), greyed when `dim`; `note` fills the line under it, if the phone has one.
 */
export function setPhoneReadout(view: DecorView, key: string, value: string, fresh = 0, opts: { note?: string; dim?: boolean } = {}) {
  const el = view.q<HTMLElement>(`[data-phone="${key}"] [data-phone-readout]`);
  el.textContent = value;
  const base = opts.dim ? MUTED : TEXT;
  el.style.color = fresh > 0 ? `color-mix(in srgb, ${BLUE} ${Math.round(100 * clamp(fresh))}%, ${base})` : base;
  if (opts.note !== undefined) view.q<HTMLElement>(`[data-phone="${key}"] [data-phone-note]`).textContent = opts.note;
}

/** The centre of button `index` (in reading order) on a phone drawn with options `o`, in the phone's coordinates. */
export function phoneButtonAt(o: Parts & { x: number; y: number; w: number; h: number }, index: number): { x: number; y: number } {
  const grid = buttonGrid(o);
  if (index < 0 || index >= grid.labels.length) throw new Error(`phone has no button ${index}`);
  const bh = buttonH(o.fontSize);
  const inner = o.w - 2 * (BEZEL + SCREEN_PAD);
  const cw = (inner - (grid.columns - 1) * GAP) / grid.columns;
  const row = Math.floor(index / grid.columns);
  const col = index % grid.columns;
  const bottom = o.y + o.h - BEZEL - HOME_H;
  return { x: o.x + BEZEL + SCREEN_PAD + col * (cw + GAP) + cw / 2, y: bottom - (grid.rows - row) * (bh + GAP) + GAP + bh / 2 };
}

/** Presses phone `key`'s button `index` (in reading order) by `pressed` (0 up … 1 down). */
export function setPhoneButton(view: DecorView, key: string, pressed: number, index = 0) {
  const el = view.qa<HTMLElement>(`[data-phone="${key}"] [data-phone-button]`)[index];
  if (!el) throw new Error(`phone ${key} has no button ${index}`);
  const p = clamp(pressed);
  el.style.transform = `scale(${1 - 0.06 * p})`;
  el.style.background = `color-mix(in srgb, ${BLUE_EDGE} ${Math.round(100 * p)}%, ${BLUE})`;
}

const CHAT: PhoneMessage[] = [
  { t: 600, text: '1', from: 'out' },
  { t: 900, text: 'LED=ON', from: 'in' },
  { t: 1800, text: '0', from: 'out' },
  { t: 2100, text: 'LED=OFF', from: 'in' },
];

const NOTIFY = [1200, 2200, 3200];

const ALERT_BUTTONS = ['Mild', 'High', 'None'];
const ALERT_PARTS = { fontSize: 18, status: true, readout: 'Link Loss', buttons: ALERT_BUTTONS, buttonsLabel: 'Alert' };
const ALERT_PHONE = { ...ALERT_PARTS, x: 50, y: 10, w: phoneWidth(9, 18), h: phoneHeight({ ...ALERT_PARTS, rows: 0 }) };

export const samples: DecorSample[] = [
  {
    name: 'phone: chat',
    w: 160,
    h: 250,
    html: phone('chat', { x: 10, y: 10, w: phoneWidth(7, 20), h: 230, fontSize: 20, title: 'HM-10' }),
    duration: 3000,
    play: (view, t) => {
      setPhoneLink(view, 'chat', t >= 300 && t < 2700);
      runPhone(view, 'chat', t, CHAT, 2700);
    },
  },
  {
    name: 'phone: chat, new messages fade in place',
    w: 160,
    h: 250,
    html: phone('fade', { x: 10, y: 10, w: phoneWidth(7, 20), h: 230, fontSize: 20, title: 'HM-10' }),
    duration: 3000,
    play: (view, t) => {
      setPhoneLink(view, 'fade', t >= 300 && t < 2700);
      runPhone(view, 'fade', t, CHAT, 2700, 'fade');
    },
  },
  {
    name: 'phone: scan, connect, notifications',
    w: 180,
    h: 250,
    html: phone('hr', { x: 10, y: 10, w: phoneWidth(10, 18), h: phoneHeight({ fontSize: 18, status: true, readout: 'Heart rate', rows: 0 }), fontSize: 18, title: 'BLE-HR', status: true, readout: 'Heart rate', maxRows: 0 }),
    duration: 4000,
    play: (view, t) => {
      setPhoneLink(view, 'hr', t < 800 ? 'scanning' : t < 3700 ? 'connected' : 'idle');
      const n = NOTIFY.findLast((at) => at <= t);
      setPhoneReadout(view, 'hr', n === undefined || t >= 3700 ? '--' : `${64 + NOTIFY.indexOf(n)} bpm`, n === undefined ? 0 : 1 - (t - n) / 400);
    },
  },
  {
    name: 'phone: readout with a note',
    w: 200,
    h: 230,
    html: phone('note', { x: 10, y: 10, w: phoneWidth(11, 18), h: phoneHeight({ fontSize: 18, readout: 'Heart rate', note: true, rows: 0 }), fontSize: 18, title: 'BLE-HR', readout: 'Heart rate', note: true, maxRows: 0 }),
    duration: 3000,
    play: (view, t) => {
      setPhoneLink(view, 'note', 'connected');
      const contact = t < 1500;
      setPhoneReadout(view, 'note', '64 bpm', 1 - (t % 1000) / 400, { note: contact ? 'Contact' : 'No contact', dim: !contact });
    },
  },
  {
    name: 'phone: button grid',
    w: 240,
    h: 300,
    html: phone('grid', { x: 10, y: 10, w: phoneWidth(16, 18), h: 280, fontSize: 18, title: 'UART', status: true, buttons: ['LED ON', 'LED OFF', 'TEMP?', 'HELLO'] }),
    duration: 3000,
    play: (view, t) => {
      setPhoneLink(view, 'grid', 'connected');
      for (let i = 0; i < 4; i++) setPhoneButton(view, 'grid', t >= 300 + 600 * i && t < 500 + 600 * i ? 1 : 0, i);
      runPhone(
        view,
        'grid',
        t,
        [
          { t: 400, text: 'LED ON', from: 'out' },
          { t: 650, text: 'OK', from: 'in' },
          { t: 2200, text: 'HELLO', from: 'out' },
          { t: 2450, text: 'ERR', from: 'in' },
        ],
        2700,
      );
    },
  },
  {
    name: 'phone: WiFi setup app',
    w: 200,
    h: 260,
    html: phone('wifi', { x: 10, y: 10, w: phoneWidth(11, 18), h: 240, fontSize: 18, title: 'Velxio-Setup', radio: 'wifi', button: 'Provision' }),
    duration: 3000,
    play: (view, t) => {
      setPhoneLink(view, 'wifi', t < 2400);
      setPhoneButton(view, 'wifi', t >= 300 && t < 500 ? 1 : 0);
      runPhone(
        view,
        'wifi',
        t,
        [
          { t: 400, text: 'interval=3', from: 'out' },
          { t: 700, text: '200 OK', from: 'in' },
        ],
        2700,
      );
    },
  },
  {
    name: 'phone: command button and replies',
    w: 180,
    h: 300,
    html: phone('cmd', { x: 10, y: 10, w: phoneWidth(10, 18), h: 280, fontSize: 18, title: 'Console', status: true, button: 'LED ON' }),
    duration: 3000,
    play: (view, t) => {
      setPhoneLink(view, 'cmd', 'connected');
      setPhoneButton(view, 'cmd', t >= 700 && t < 900 ? 1 : 0);
      runPhone(
        view,
        'cmd',
        t,
        [
          { t: 800, text: 'LED ON', from: 'out' },
          { t: 1100, text: 'OK', from: 'in' },
        ],
        2700,
      );
    },
  },
  {
    name: 'phone: labelled buttons tapped by a finger',
    w: 220,
    h: 330,
    html: phone('alert', { ...ALERT_PHONE, title: 'Finder', maxRows: 0 }) + finger('alert-f', { rotate: 270, length: 60 }),
    duration: 3000,
    play: (view, t) => {
      setPhoneLink(view, 'alert', 'connected');
      setPhoneReadout(view, 'alert', 'High');
      const taps = ALERT_BUTTONS.map((_, i) => ({ at: phoneButtonAt(ALERT_PHONE, i), down: 300 + 900 * i, up: 500 + 900 * i }));
      const pressed = tapFinger(view, 'alert-f', t, taps, 3000);
      for (let i = 0; i < ALERT_BUTTONS.length; i++) setPhoneButton(view, 'alert', pressed === i ? 1 : 0, i);
    },
  },
];
