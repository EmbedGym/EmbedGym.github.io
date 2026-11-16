import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { laser, setLaser } from '../../decor/laser';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';
import { setSound, sound } from '../../decor/sound';

type Laser = HTMLElement & { laserOn: boolean };
type Buzzer = HTMLElement & { hasSignal: boolean };

// Same sketch as the Mega: every 50 ms it reads A0 (darker = higher) and sounds 2 kHz above 600.
const WIRES = { laser: 'w-8-signal', light: 'w-A0-S', buzzer: 'w-3-BZ1' };

const DURATION = 4000;
const SLIDE_IN = 800;
const SLIDE_OUT = 2600;
const SLIDE_MS = 300;
const LOOP_MS = 50;
const THRESHOLD = 600;
// test.jsonl's light levels 900 (beam on the LDR) and 100 (beam blocked) on a 5 V divider.
const LIT = 123;
const DARK = 923;

// The box slides in from the right, between the beam and the GND trunk.
const BOX = { ...obstacleSize('box', 0.3), y: 36, fromX: -59, toX: -79 };
// The reading panel sits left of the 5V trunk, beside K1 and the beam.
const PANEL = { x: -290, y: -24, w: 176, h: 132 };
const BAR = { x: 16, y: 82, w: 144, h: 12 };
const MARK_X = BAR.x + (BAR.w * THRESHOLD) / 1023;

function boxLeft(t: number) {
  const p = easeInOutCubic(clamp((t - SLIDE_IN) / SLIDE_MS)) - easeInOutCubic(clamp((t - SLIDE_OUT) / SLIDE_MS));
  return lerp(BOX.fromX, BOX.toX, p);
}

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-lzu-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-lzu-row { position: absolute; left: 16px; right: 16px; font: 700 24px var(--mono); color: var(--ink); white-space: nowrap; }
        .c-lzu-track { position: absolute; border-radius: 5px; background: #f1f3f6; border: 1.5px solid #e2e6ec; overflow: hidden; }
        .c-lzu-fill { height: 100%; background: #0066ff; }
        .c-lzu-mark { position: absolute; width: 2px; background: #64748b; }
        .c-lzu-tag { position: absolute; font: 700 24px/1 var(--mono); color: #64748b; }
        .c-lzu-title { position: absolute; left: 16px; font: 700 24px/1.2 var(--sans); color: var(--ink); white-space: nowrap; }
      </style>
      ${laser('beam')}${sound('buzz')}${obstacle('box', 'box', 0.3)}
      <div class="c-lzu-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-lzu-title" style="top:8px">K1 light</div>
        <div class="c-lzu-row" style="top:42px">A0 <span style="color:#0066ff" data-k="read"></span></div>
        <div class="c-lzu-track" style="left:${BAR.x}px;top:${BAR.y}px;width:${BAR.w}px;height:${BAR.h}px"><div class="c-lzu-fill"></div></div>
        <div class="c-lzu-mark" style="left:${MARK_X - 1}px;top:${BAR.y - 5}px;height:${BAR.h + 10}px"></div>
        <div class="c-lzu-tag" style="left:${MARK_X - 22}px;top:${BAR.y + 18}px">600</div>
      </div>`,
    // The panel on the left; the buzzer's sound rings reach x 316 at most.
    bounds: [PANEL.x, PANEL.y, 316, PANEL.y + PANEL.h],
  },
  run(t, view) {
    view.part<Laser>('LZ1').laserOn = true;
    const laserBox = view.box('LZ1');
    const ldr = view.box('K1');
    const beamX = laserBox.x + laserBox.w / 2;
    const beamTop = laserBox.y + laserBox.h - 4;
    const ldrY = ldr.y + 12;

    // How much of the 6 px beam the box covers at time `at`, 0..1.
    const cover = (at: number) => {
      const left = boxLeft(at);
      return clamp((left + BOX.w - (beamX - 3)) / 6) * clamp((beamX + 3 - left) / 6);
    };
    const now = cover(t);
    placeObstacle(view, 'box', boxLeft(t), BOX.y);
    setLaser(view, 'beam', { x: beamX, y: beamTop }, { x: beamX, y: now > 0.5 ? BOX.y : ldrY }, 1, 1 - now);
    view.glowWire(WIRES.laser, 1);

    // The sketch acts on the A0 reading it took at the start of the current 50 ms loop.
    const value = Math.round(lerp(LIT, DARK, cover(Math.floor(t / LOOP_MS) * LOOP_MS)));
    view.q<HTMLElement>('[data-k="read"]').textContent = String(value);
    view.q<HTMLElement>('.c-lzu-fill').style.width = `${(100 * value) / 1023}%`;

    // The S wire's halo follows its voltage.
    view.glowWire(WIRES.light, value / 1023);

    const alarm = value > THRESHOLD;
    view.part<Buzzer>('BZ1').hasSignal = alarm;
    if (alarm) view.glowWire(WIRES.buzzer, 1);
    const buzzer = view.box('BZ1');
    setSound(view, 'buzz', { x: buzzer.x + buzzer.w / 2, y: buzzer.y + buzzer.w / 2 }, alarm ? t / 250 : null, { dir: 'right', from: 36, to: 76 });
  },
};

export default cell;
