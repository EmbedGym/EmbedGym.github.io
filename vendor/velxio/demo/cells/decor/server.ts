import { clamp, easeInOutCubic } from '../anim';
import { BLUE, BLUE_EDGE, FACE, FACE_EDGE, GREEN, INK, MUTED, PHONE_RULE, TEXT, type DecorSample, type DecorView } from './common';

/**
 * What the service is, which sets its icon: `broker` (MQTT), `web` (HTTP, REST,
 * CoAP, WebSocket), `clock` (NTP) or `database` (PostgreSQL and the like).
 */
export type ServerKind = 'broker' | 'web' | 'clock' | 'database';

/** Which side of the server the board is on; the message lane runs out that way. */
export type ServerSide = 'left' | 'right' | 'top' | 'bottom';

/**
 * A message on the lane: `to` travels from the board to the server and arrives
 * at `t`; `from` leaves the server at `t` and travels to the board.
 */
export type ServerMessage = { t: number; text: string; dir: 'to' | 'from' };

const ICON = 34;
const PAD = 10;
const CHIP_PAD = 6;
const FLIGHT = 600;
const LINGER = 200;
const FADE = 150;

const ICONS: Record<ServerKind, string> = {
  broker: `
    <g stroke="${INK}" stroke-width="2" fill="${FACE}">
      <path d="M 17 17 L 5 7 M 17 17 L 29 7 M 17 17 L 5 27 M 17 17 L 29 27" />
      <circle cx="5" cy="7" r="3.5" /><circle cx="29" cy="7" r="3.5" /><circle cx="5" cy="27" r="3.5" /><circle cx="29" cy="27" r="3.5" />
      <circle cx="17" cy="17" r="6" fill="${BLUE}" stroke="${BLUE_EDGE}" />
    </g>`,
  web: `
    <g fill="none" stroke="${BLUE_EDGE}" stroke-width="2">
      <circle cx="17" cy="17" r="14" fill="${PHONE_RULE}" />
      <ellipse cx="17" cy="17" rx="6" ry="14" />
      <path d="M 3 17 H 31 M 5.5 9.5 H 28.5 M 5.5 24.5 H 28.5" />
    </g>`,
  clock: `
    <circle cx="17" cy="17" r="14" fill="${FACE}" stroke="${INK}" stroke-width="2" />
    <path d="M 17 8 V 17 L 23.5 21" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="17" cy="17" r="1.8" fill="${INK}" />`,
  database: `
    <g stroke="${BLUE_EDGE}" stroke-width="2">
      <path d="M 5 7 V 27 A 12 4.5 0 0 0 29 27 V 7" fill="${PHONE_RULE}" />
      <path d="M 5 14 A 12 4.5 0 0 0 29 14 M 5 20.5 A 12 4.5 0 0 0 29 20.5" fill="none" />
      <ellipse cx="17" cy="7" rx="12" ry="4.5" fill="${FACE}" />
    </g>`,
};

const wifiIcon = `
  <svg data-server-wifi viewBox="0 0 20 16" width="20" height="16" style="position:absolute;right:6px;top:6px">
    <g fill="none" stroke-width="2.4" stroke-linecap="round">
      <path d="M 2 6 A 11 11 0 0 1 18 6" /><path d="M 5 9.5 A 7 7 0 0 1 15 9.5" />
    </g>
    <circle cx="10" cy="13" r="2" />
  </svg>`;

/** The width of a message chip with `chars` characters of `fontSize` px monospace text. */
export function chipWidth(chars: number, fontSize: number): number {
  return Math.ceil(chars * 0.6 * fontSize + 2 * CHIP_PAD);
}

/** The size `server` draws for `label` at `fontSize`: a bold sans label is about 0.55 em a character. */
export function serverSize(label: string, fontSize: number): { w: number; h: number } {
  return { w: Math.ceil(Math.max(ICON + 2 * 26, label.length * 0.55 * fontSize + 2 * PAD)), h: Math.ceil(PAD + ICON + 6 + 1.2 * fontSize + PAD) };
}

/**
 * A WiFi network service (a broker, web server, time server or database) as a
 * box with its icon and `label`, its top-left at (x, y) and the size
 * `serverSize` gives. A WiFi mark in its corner turns green while it is linked
 * (`setServerLink`). Messages travel along a dashed lane `reach` px long out of
 * its `side` towards the board (`runServer`); chips are `fontSize` px text, so
 * leave the lane at least as long as the longest chip (`chipWidth`).
 */
export function server(key: string, o: { x: number; y: number; kind: ServerKind; label: string; fontSize?: number; side?: ServerSide; reach?: number }): string {
  const f = o.fontSize ?? 18;
  const side = o.side ?? 'left';
  const reach = o.reach ?? 140;
  const { w, h } = serverSize(o.label, f);
  const lane =
    side === 'left' ? `left:${-reach}px;top:${h / 2}px;width:${reach}px;height:0;border-top`
    : side === 'right' ? `left:${w}px;top:${h / 2}px;width:${reach}px;height:0;border-top`
    : side === 'top' ? `left:${w / 2}px;top:${-reach}px;width:0;height:${reach}px;border-left`
    : `left:${w / 2}px;top:${h}px;width:0;height:${reach}px;border-left`;
  return `
    <div data-server="${key}" data-side="${side}" data-reach="${reach}" data-w="${w}" data-h="${h}" data-font="${f}" style="position:absolute;left:${o.x}px;top:${o.y}px;width:${w}px;height:${h}px">
      <div data-server-lane style="position:absolute;${lane}:2px dashed ${MUTED}"></div>
      <div style="position:absolute;inset:0;box-sizing:border-box;border:1.6px solid ${FACE_EDGE};border-radius:10px;background:${FACE};box-shadow:0 2px 0 ${FACE_EDGE}">
        <svg viewBox="0 0 34 34" width="${ICON}" height="${ICON}" style="position:absolute;left:${(w - ICON) / 2}px;top:${PAD}px">${ICONS[o.kind]}</svg>
        ${wifiIcon}
        <div style="position:absolute;left:0;right:0;top:${PAD + ICON + 6}px;text-align:center;white-space:nowrap;font:700 ${f}px/1.2 var(--sans);color:${TEXT}">${o.label}</div>
      </div>
      <div data-server-chips style="position:absolute;left:0;top:0"></div>
    </div>`;
}

/** Turns server `key`'s WiFi mark and lane green while it is linked, grey otherwise. */
export function setServerLink(view: DecorView, key: string, linked: boolean) {
  const color = linked ? GREEN : MUTED;
  const el = view.q<HTMLElement>(`[data-server="${key}"]`);
  const wifi = el.querySelector<SVGElement>('[data-server-wifi]')!;
  wifi.querySelector('g')!.setAttribute('stroke', color);
  wifi.querySelector('circle')!.setAttribute('fill', color);
  el.querySelector<HTMLElement>('[data-server-lane]')!.style.borderColor = color;
}

/**
 * Draws the messages in flight on server `key`'s lane at `t`. Each chip glides
 * the length of the lane in 600 ms, waits 200 ms at the end it reached and
 * fades over 150 ms: a `to` message arrives at its `t`, a `from` message
 * leaves at its `t`. Repeat the previous loop's late messages at `t - duration`
 * so the seam stays continuous. `timing` shortens those three phases for a
 * busy lane.
 */
export function runServer(
  view: DecorView,
  key: string,
  t: number,
  messages: ServerMessage[],
  timing: { flight: number; linger: number; fade: number } = { flight: FLIGHT, linger: LINGER, fade: FADE },
) {
  const { flight, linger, fade } = timing;
  const el = view.q<HTMLElement>(`[data-server="${key}"]`);
  const side = el.dataset.side as ServerSide;
  const reach = Number(el.dataset.reach);
  const w = Number(el.dataset.w);
  const h = Number(el.dataset.h);
  const f = Number(el.dataset.font);
  const chips = messages.flatMap((m) => {
    const start = m.dir === 'to' ? m.t - flight : m.t;
    const age = t - start;
    if (age < 0 || age >= flight + linger + fade) return [];
    // 0 at the server's edge, 1 at the board's end of the lane.
    const glide = easeInOutCubic(clamp(age / flight));
    const k = m.dir === 'to' ? 1 - glide : glide;
    const opacity = Math.min(clamp(age / 100), 1 - clamp((age - flight - linger) / fade));
    const cw = chipWidth(m.text.length, f);
    const ch = Math.round(1.3 * f);
    // The chip's centre runs from just outside the server to just inside the lane's far end.
    let cx: number;
    let cy: number;
    if (side === 'left' || side === 'right') {
      const d = cw / 2 + 4 + k * (reach - cw - 8);
      cx = side === 'left' ? -d : w + d;
      cy = h / 2;
    } else {
      const d = ch / 2 + 4 + k * (reach - ch - 8);
      cx = w / 2;
      cy = side === 'top' ? -d : h + d;
    }
    const look = m.dir === 'to' ? `background:${PHONE_RULE};color:${TEXT}` : `background:${BLUE};color:${FACE}`;
    return [
      `<div style="position:absolute;left:${cx - cw / 2}px;top:${cy - ch / 2}px;width:${cw}px;height:${ch}px;box-sizing:border-box;border-radius:${ch / 2}px;${look};opacity:${opacity};text-align:center;white-space:nowrap;font:600 ${f}px/${ch}px var(--mono)">${m.text}</div>`,
    ];
  });
  el.querySelector<HTMLElement>('[data-server-chips]')!.innerHTML = chips.join('');
}

const PUBLISH: ServerMessage[] = [
  { t: 900, text: 'temp=23.5', dir: 'to' },
  { t: 1300, text: 'OK', dir: 'from' },
];
const QUERY: ServerMessage[] = [
  { t: 900, text: 'INSERT', dir: 'to' },
  { t: 1300, text: 'INSERT 0 1', dir: 'from' },
];

export const samples: DecorSample[] = [
  {
    name: 'server: MQTT broker, publish',
    w: 300,
    h: 90,
    html: server('mqtt', { x: 160, y: 10, kind: 'broker', label: 'MQTT broker', reach: 140 }),
    duration: 2400,
    play: (view, t) => {
      setServerLink(view, 'mqtt', t >= 300);
      runServer(view, 'mqtt', t, PUBLISH);
    },
  },
  {
    name: 'server: HTTP, bottom lane',
    w: 170,
    h: 230,
    html: server('web', { x: 20, y: 10, kind: 'web', label: 'HTTP server', side: 'bottom', reach: 130 }),
    duration: 2400,
    play: (view, t) => {
      setServerLink(view, 'web', true);
      runServer(view, 'web', t, [
        { t: 800, text: 'GET /', dir: 'to' },
        { t: 1200, text: '200', dir: 'from' },
      ]);
    },
  },
  {
    name: 'server: NTP, right lane',
    w: 300,
    h: 90,
    html: server('ntp', { x: 10, y: 10, kind: 'clock', label: 'NTP server', side: 'right', reach: 160 }),
    duration: 2400,
    play: (view, t) => {
      setServerLink(view, 'ntp', true);
      runServer(view, 'ntp', t, [
        { t: 800, text: 'time?', dir: 'to' },
        { t: 1200, text: '12:00:05', dir: 'from' },
      ]);
    },
  },
  {
    name: 'server: PostgreSQL',
    w: 290,
    h: 90,
    html: server('pg', { x: 160, y: 10, kind: 'database', label: 'PostgreSQL', reach: 150 }),
    duration: 2400,
    play: (view, t) => {
      setServerLink(view, 'pg', t < 2100);
      runServer(view, 'pg', t, QUERY);
    },
  },
];
