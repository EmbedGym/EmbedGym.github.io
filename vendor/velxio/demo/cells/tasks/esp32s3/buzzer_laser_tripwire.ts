import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { laser, setLaser } from '../../decor/laser';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';
import { setSound, sound } from '../../decor/sound';

type Laser = HTMLElement & { laserOn: boolean };
type Buzzer = HTMLElement & { hasSignal: boolean };

// main.c reads GPIO9 (12-bit, darker = higher) every 50 ms and drives a 2 kHz LEDC tone on GPIO11 above 2400.
const WIRES = { laser: 'w-10-signal', light: 'w-9-S', buzzer: 'w-11-BZ1' };

const DURATION = 4000;
const SLIDE_IN = 800;
const SLIDE_OUT = 2600;
const SLIDE_MS = 300;
const LOOP_MS = 50;
const FULL = 4095;
const THRESHOLD = 2400;
// test.jsonl's light levels 900 (beam on the LDR) and 100 (beam blocked) on the 3.3 V divider.
const LIT = 492;
const DARK = 3695;

// The laser points up at K1's LDR; the box slides in from the left, between them.
const BOX = { ...obstacleSize('box', 0.3), y: 92, fromX: -166, toX: -136 };
// The reading panel sits left of K1 and the beam.
// The card's scale is low (the board is tall), so the panel text is drawn larger.
const FONT = 32;
const PANEL = { x: -420, y: 0, w: 236, h: 166 };
const BAR = { x: 20, y: 106, w: 196, h: 14 };
const MARK_X = BAR.x + (BAR.w * THRESHOLD) / FULL;

function boxLeft(t: number) {
  const p = easeInOutCubic(clamp((t - SLIDE_IN) / SLIDE_MS)) - easeInOutCubic(clamp((t - SLIDE_OUT) / SLIDE_MS));
  return lerp(BOX.fromX, BOX.toX, p);
}

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-lze-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-lze-title { position: absolute; left: 18px; font: 700 ${FONT}px/1.2 var(--sans); color: var(--ink); white-space: nowrap; }
        .c-lze-row { position: absolute; left: 18px; font: 700 ${FONT}px/1.2 var(--mono); color: var(--ink); white-space: nowrap; }
        .c-lze-track { position: absolute; border-radius: 5px; background: #f1f3f6; border: 1.5px solid #e2e6ec; overflow: hidden; }
        .c-lze-fill { height: 100%; background: #0066ff; }
        .c-lze-mark { position: absolute; width: 2px; background: #64748b; }
        .c-lze-tag { position: absolute; font: 700 ${FONT}px/1 var(--mono); color: #64748b; }
      </style>
      ${laser('beam')}${sound('buzz')}${obstacle('box', 'box', 0.3)}
      <div class="c-lze-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-lze-title" style="top:8px">K1 light</div>
        <div class="c-lze-row" style="top:50px">IO9 <span style="color:#0066ff" data-k="read"></span></div>
        <div class="c-lze-track" style="left:${BAR.x}px;top:${BAR.y}px;width:${BAR.w}px;height:${BAR.h}px"><div class="c-lze-fill"></div></div>
        <div class="c-lze-mark" style="left:${MARK_X - 1}px;top:${BAR.y - 5}px;height:${BAR.h + 10}px"></div>
        <div class="c-lze-tag" style="left:${MARK_X - 38}px;top:${BAR.y + 22}px">2400</div>
      </div>`,
    bounds: [PANEL.x, -10, 140, 405],
  },
  run(t, view) {
    view.part<Laser>('LZ1').laserOn = true;
    const laserBox = view.box('LZ1');
    const ldr = view.box('K1');
    const beamX = laserBox.x + laserBox.w / 2;
    const beamFrom = laserBox.y + 4;
    // K1 is turned 270°, so its LDR sits at the left end of the module.
    const ldrY = ldr.y + ldr.h / 2;

    // How much of the 6 px beam the box covers at time `at`, 0..1.
    const cover = (at: number) => {
      const left = boxLeft(at);
      return clamp((left + BOX.w - (beamX - 3)) / 6) * clamp((beamX + 3 - left) / 6);
    };
    const now = cover(t);
    placeObstacle(view, 'box', boxLeft(t), BOX.y);
    setLaser(view, 'beam', { x: beamX, y: beamFrom }, { x: beamX, y: now > 0.5 ? BOX.y + BOX.h : ldrY }, 1, 1 - now);
    view.glowWire(WIRES.laser, 1);

    // main.c acts on the reading it took at the start of the current 50 ms loop.
    const value = Math.round(lerp(LIT, DARK, cover(Math.floor(t / LOOP_MS) * LOOP_MS)));
    view.q<HTMLElement>('[data-k="read"]').textContent = String(value);
    view.q<HTMLElement>('.c-lze-fill').style.width = `${(100 * value) / FULL}%`;

    // The S wire's halo follows its voltage.
    view.glowWire(WIRES.light, value / FULL);

    const alarm = value > THRESHOLD;
    view.part<Buzzer>('BZ1').hasSignal = alarm;
    if (alarm) view.glowWire(WIRES.buzzer, 1);
    const buzzer = view.box('BZ1');
    setSound(view, 'buzz', { x: buzzer.x + buzzer.w / 2, y: buzzer.y + buzzer.h / 2 }, alarm ? t / 250 : null, { dir: 'left', from: 36, to: 76 });
  },
};

export default cell;
