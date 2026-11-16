import { clamp, lerp } from '../anim';
import { BLUE, BLUE_EDGE, BLUE_LIGHT, METAL_EDGE, METAL_LIGHT, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };

const satelliteSvg = `
  <svg viewBox="-36 -16 72 32" width="72" height="32">
    <rect x="-35" y="-9" width="24" height="18" rx="2" fill="${BLUE}" stroke="${BLUE_EDGE}" stroke-width="1.5"/>
    <path d="M -27 -9 V 9 M -19 -9 V 9 M -35 0 H -11" stroke="${BLUE_LIGHT}" stroke-width="1"/>
    <rect x="11" y="-9" width="24" height="18" rx="2" fill="${BLUE}" stroke="${BLUE_EDGE}" stroke-width="1.5"/>
    <path d="M 19 -9 V 9 M 27 -9 V 9 M 11 0 H 35" stroke="${BLUE_LIGHT}" stroke-width="1"/>
    <path d="M -11 0 H 11" stroke="${METAL_EDGE}" stroke-width="3"/>
    <rect x="-8" y="-13" width="16" height="26" rx="3" fill="${METAL_LIGHT}" stroke="${METAL_EDGE}" stroke-width="1.5"/>
  </svg>`;

/**
 * `count` satellites (72 x 32 each) and a dashed radio beam from each. Place
 * them and draw the beams with `runSatellites`.
 */
export function satellites(key: string, count: number): string {
  const beams = `<path data-sat-beam fill="none" stroke="${BLUE}" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round" />`;
  const sat = `<div data-sat style="position:absolute;left:0;top:0">${satelliteSvg}</div>`;
  return `
    <div data-satellites="${key}" style="position:absolute;left:0;top:0">
      <svg style="position:absolute;left:0;top:0;width:10px;height:10px;overflow:visible;pointer-events:none">${beams.repeat(count)}</svg>
      ${sat.repeat(count)}
    </div>`;
}

/**
 * Satellites `key` at time `t`: each drifts slowly round its point in `homes`
 * (centres), repeating every `duration`, and beams toward `to`. A beam stops
 * where it crosses x = `stopX` (a receiver's edge, say) and is drawn to
 * fraction `lock` (0 none … 1 all the way), fading in with it.
 */
export function runSatellites(view: DecorView, key: string, t: number, o: { homes: Point[]; to: Point; stopX: number; lock: number; duration: number }) {
  const root = view.q<HTMLElement>(`[data-satellites="${key}"]`);
  const sats = [...root.querySelectorAll<HTMLElement>('[data-sat]')];
  const beams = [...root.querySelectorAll<SVGPathElement>('[data-sat-beam]')];
  sats.forEach((sat, k) => {
    const home = o.homes[k];
    const x = home.x + 6 * Math.sin((2 * Math.PI * t) / o.duration + 2 * k);
    const y = home.y + 4 * Math.cos((2 * Math.PI * t) / o.duration + 2 * k);
    sat.style.transform = `translate(${x - 36}px, ${y - 16}px) rotate(${-20 + 8 * k}deg)`;
    const from = { x: x + 10, y: y + 14 };
    const end = { x: o.stopX, y: lerp(from.y, o.to.y, (o.stopX - from.x) / (o.to.x - from.x)) };
    beams[k].setAttribute('d', `M ${from.x} ${from.y} L ${lerp(from.x, end.x, o.lock)} ${lerp(from.y, end.y, o.lock)}`);
    beams[k].style.opacity = String(o.lock);
    beams[k].style.strokeDashoffset = String(-t / 25);
  });
}

export const samples: DecorSample[] = [
  {
    name: 'satellites: locking on',
    w: 300,
    h: 150,
    html: `${satellites('sky', 3)}<div style="position:absolute;left:250px;top:90px;width:40px;height:40px;border-radius:4px;background:${METAL_LIGHT};border:1.5px solid ${METAL_EDGE}"></div>`,
    duration: 4000,
    play: (view, t) =>
      runSatellites(view, 'sky', t, {
        homes: [
          { x: 50, y: 100 },
          { x: 90, y: 60 },
          { x: 180, y: 30 },
        ],
        to: { x: 270, y: 110 },
        stopX: 250,
        lock: clamp((t - 500) / 300) * clamp((3500 - t) / 300),
        duration: 4000,
      }),
  },
];
