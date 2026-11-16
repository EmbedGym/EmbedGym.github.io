import { clamp, easeOutCubic, lerp, sinceLast } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { glow, setGlow } from '../../decor/glow';
import { hand, setHand } from '../../decor/hand';
import { setSound, sound } from '../../decor/sound';

type SoundSensor = HTMLElement & { detected: boolean };
type Relay = HTMLElement & { energized: boolean };

// main.c: a rising edge on P0.03 toggles the relay on P1.15 (polled every 10 ms, 200 ms lockout).
const WIRE = { d0: 'w-P0.03-D0', in: 'w-P1.15-IN' };

// Each clap is a 200 ms burst on the microphone, as in test.jsonl; the firmware toggles the relay on each one.
const CLAPS = [400, 1000, 1600, 2200, 2800, 3400, 4000, 4600];
// Right of the mic, level with its capsule (the mic hangs under the board, pins up).
const CLAP_POINT = [356, 335];

// The relay's load, which circuit.ts leaves out: a festoon lamp and a 12 V pack, below-left of the relay's terminals.
const lampSvg = `
  <svg viewBox="0 0 72 66" width="72" height="66">
    <path d="M 32 54 V 62 H 0 M 40 54 V 62 H 72" fill="none" stroke="#8b95a1" stroke-width="2.6"/>
    <path class="c-clapn-glass" d="M 27 42 C 12 34 10 2 36 2 C 62 2 60 34 45 42 Z" stroke="#a7b0bb" stroke-width="1.4"/>
    <path d="M 31 42 V 24 M 41 42 V 24 M 31 24 l 2 -3 l 2 3 l 2 -3 l 2 3 l 2 -3" fill="none" stroke="#7c5a2a" stroke-width="1.4"/>
    <rect x="27" y="41" width="18" height="14" rx="2" fill="#c3c9d1" stroke="#8b95a1"/>
    <path d="M 27 45.5 H 45 M 27 50 H 45" stroke="#8b95a1" stroke-width="1.2"/>
  </svg>`;
const LAMP = { x: -254, y: 40 };

// 1 while the hands are apart, 0 at the moment they meet.
function handOpening(t: number) {
  return Math.min(
    1,
    ...CLAPS.map((clap) => {
      const d = t - clap;
      if (d < -140 || d > 340) return 1;
      if (d < 0) return -d / 140;
      return d < 60 ? 0 : easeOutCubic((d - 60) / 280);
    }),
  );
}

const clapSwitch: Cell = {
  // The last clap's rings finish fading (3 rings x 140 ms + 3-wave life) before the loop restarts.
  duration: 5300,
  extras: {
    parts: [
      { id: 'LAMP', ...LAMP, html: lampSvg, pins: { A: { x: 0, y: 62 }, B: { x: 72, y: 62 } } },
      batteryPart('BAT', -154, 20, { plus: 'up' }),
    ],
    wires: [
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['LAMP', 'B'], color: '#f59e0b', via: [{ x: -182, y: -20 }] },
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#8b4513', via: [{ x: -140, y: -10 }] },
      { id: 'load-ret', from: ['LAMP', 'A'], to: ['BAT', 'neg'], color: '#000000', via: [{ x: -254, y: 120 }, { x: -140, y: 120 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-clapn-spark { stroke: #f59e0b; stroke-width: 4; stroke-linecap: round; }
        .c-clapn-glass { fill: color-mix(in srgb, #ffd65a calc(100% * var(--on, 0)), #eef2f6); }
      </style>
      ${glow('lamp', { tone: 'lamp', scale: 1.7 })}
      ${sound('clap')}
      <svg class="cell-air" viewBox="0 0 10 10">
        ${'<line class="c-clapn-spark"/>'.repeat(5)}
      </svg>
      ${hand('left')}${hand('right', { mirror: true })}`,
    bounds: [264, 251, 430, 383],
  },
  run(t, view) {
    const mic = view.box('MIC1');
    const micRight = mic.x + mic.w;
    const clapsHeard = CLAPS.filter((clap) => clap <= t).length;
    const relayOn = clapsHeard % 2 === 1;
    const sinceClap = sinceLast(t, CLAPS);
    const heard = sinceClap < 200;
    view.part<SoundSensor>('MIC1').detected = heard;
    view.part<Relay>('RLY1').energized = relayOn;
    if (heard) view.glowWire(WIRE.d0, 1);
    if (relayOn) {
      view.glowWire(WIRE.in, 1);
      for (const id of ['load-no', 'load-ret', 'load-com']) view.glowWire(id, 0.6);
    }

    // The lamp warms up and cools down over a few frames rather than snapping.
    const fade = clamp((sinceClap - 10) / 80);
    const on = relayOn ? fade : 1 - fade;
    view.q<SVGElement>('.c-clapn-glass').style.setProperty('--on', String(on));
    setGlow(view, 'lamp', { x: LAMP.x + 36, y: LAMP.y + 20 }, on);

    const opening = handOpening(t);
    for (const side of [-1, 1]) {
      const at = { x: CLAP_POINT[0] + side * (22 + 16 * opening), y: CLAP_POINT[1] + 22 };
      setHand(view, side < 0 ? 'left' : 'right', at, { tilt: side * 14 * opening });
    }

    // Three rings per clap; the sound reaches the microphone's edge, not across it and its pins.
    const [cx, cy] = CLAP_POINT;
    setSound(view, 'clap', { x: cx, y: cy }, Number.isFinite(sinceClap) ? sinceClap / 140 : null, { dir: 'left', from: 64, to: cx - micRight - 12, count: 3 });
    view.qa<SVGLineElement>('.c-clapn-spark').forEach((spark, k) => {
      const p = clamp(sinceClap / 220);
      const angle = -Math.PI / 2 + (k - 2) * 0.5;
      const [sx, sy] = [cx, cy - 48];
      spark.setAttribute('x1', String(sx + Math.cos(angle) * lerp(6, 22, p)));
      spark.setAttribute('y1', String(sy + Math.sin(angle) * lerp(6, 22, p)));
      spark.setAttribute('x2', String(sx + Math.cos(angle) * lerp(12, 36, p)));
      spark.setAttribute('y2', String(sy + Math.sin(angle) * lerp(12, 36, p)));
      spark.style.opacity = p < 1 ? String(1 - p) : '0';
    });
  },
};

export default clapSwitch;
