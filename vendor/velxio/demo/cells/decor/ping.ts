import { clamp, easeOutCubic, lerp } from '../anim';
import { BLUE, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };

/**
 * An ultrasonic ping: a ring leaving the transmit can and, if the ping has an
 * echo, a ring closing on the receive can. Drawn in the cell's own coordinates
 * (the overlay's origin is the element's (0, 0)); place it with `runPing`.
 */
export function ping(key: string): string {
  return `
    <svg data-ping="${key}" width="1" height="1" overflow="visible" style="position:absolute;left:0;top:0">
      <circle class="d-ping-out" fill="none" stroke="${BLUE}" stroke-width="4" opacity="0" />
      <circle class="d-ping-echo" fill="none" stroke="${BLUE}" stroke-width="4" opacity="0" />
    </svg>`;
}

export interface PingOptions {
  /** Centre of the transmit can. */
  tx: Point;
  /** Centre of the receive can; omit for a ping drawn without its echo. */
  rx?: Point;
  /** Can radius: the out ring grows from 0.4 r to 1.15 r, the echo shrinks back. */
  r: number;
  /** How long the echo takes to come back, ms. */
  echoMs?: number;
}

/**
 * Draws ping `key` `since` ms after the ping went out: the out ring spreads and
 * fades over 120 ms; the echo ring closes on the receive can from 20 ms until
 * `echoMs` later.
 */
export function runPing(view: DecorView, key: string, since: number, o: PingOptions) {
  const svg = view.q<SVGSVGElement>(`[data-ping="${key}"]`);
  const out = svg.querySelector<SVGCircleElement>('.d-ping-out')!;
  const p = clamp(since / 120);
  out.setAttribute('cx', String(o.tx.x));
  out.setAttribute('cy', String(o.tx.y));
  out.setAttribute('r', String(lerp(o.r * 0.4, o.r * 1.15, easeOutCubic(p))));
  out.setAttribute('opacity', since >= 0 && p < 1 ? String(0.9 * (1 - p)) : '0');

  const echo = svg.querySelector<SVGCircleElement>('.d-ping-echo')!;
  if (!o.rx || !o.echoMs) {
    echo.setAttribute('opacity', '0');
    return;
  }
  const q = clamp((since - 20) / o.echoMs);
  echo.setAttribute('cx', String(o.rx.x));
  echo.setAttribute('cy', String(o.rx.y));
  echo.setAttribute('r', String(lerp(o.r * 1.15, o.r * 0.4, q)));
  echo.setAttribute('opacity', q > 0 && q < 1 ? String(0.9 * Math.sin(Math.PI * q)) : '0');
}

const CANS = `
  <div style="position:absolute;left:10px;top:20px;width:160px;height:60px;border-radius:6px;background:#3b6ea5"></div>
  <div style="position:absolute;left:22px;top:28px;width:44px;height:44px;border-radius:50%;background:#222"></div>
  <div style="position:absolute;left:114px;top:28px;width:44px;height:44px;border-radius:50%;background:#222"></div>`;

export const samples: DecorSample[] = [
  {
    name: 'ping: out and echo',
    w: 180,
    h: 100,
    html: `${CANS}${ping('s')}`,
    duration: 400,
    play: (view, t) => runPing(view, 's', t % 400, { tx: { x: 44, y: 50 }, rx: { x: 136, y: 50 }, r: 22, echoMs: 160 }),
  },
  {
    name: 'ping: out only',
    w: 180,
    h: 100,
    html: `${CANS}${ping('o')}`,
    duration: 400,
    play: (view, t) => runPing(view, 'o', t % 200, { tx: { x: 44, y: 50 }, r: 22 }),
  },
];
