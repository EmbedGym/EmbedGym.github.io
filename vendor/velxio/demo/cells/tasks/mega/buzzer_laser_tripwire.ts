import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { laser, setLaser } from '../../decor/laser';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';
import { setSound, sound } from '../../decor/sound';

type Laser = HTMLElement & { laserOn: boolean };
type Buzzer = HTMLElement & { hasSignal: boolean };

// The laser shines down onto the photoresistor. A box slides into the beam and out
// again. Every 50 ms the sketch reads A0 (darker = higher) and sounds 2 kHz above 600.
const DURATION = 4000;
const SLIDE_IN = 800;
const SLIDE_OUT = 2600;
const SLIDE_MS = 300;
const LOOP_MS = 50;
const THRESHOLD = 600;
const LIT = 90;
const DARK = 870;

// The box slides in from the right, between the beam and the GND trunk.
const BOX = { ...obstacleSize('box', 0.3), y: 36, fromX: -59, toX: -79 };
// The reading panel sits right of the laser, under its wires to the top header.
const PANEL = { x: -10, y: -70, w: 124, h: 58 };
const BAR = { x: 14, y: 36, w: 96, h: 12 };

function boxLeft(t: number) {
  const p = easeInOutCubic(clamp((t - SLIDE_IN) / SLIDE_MS)) - easeInOutCubic(clamp((t - SLIDE_OUT) / SLIDE_MS));
  return lerp(BOX.fromX, BOX.toX, p);
}

const buzzerLaserTripwire: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-lz-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-lz-row { position: absolute; left: 14px; right: 14px; font: 700 24px var(--mono); color: var(--ink); white-space: nowrap; }
        .c-lz-track { position: absolute; left: ${BAR.x}px; top: ${BAR.y}px; width: ${BAR.w}px; height: ${BAR.h}px; border-radius: 5px; background: #f1f3f6; border: 1.5px solid #e2e6ec; overflow: hidden; }
        .c-lz-fill { height: 100%; background: #0066ff; }
        .c-lz-mark { position: absolute; top: ${BAR.y - 5}px; width: 2px; height: ${BAR.h + 10}px; background: #64748b; left: ${BAR.x + (BAR.w * THRESHOLD) / 1023}px; }
      </style>
      ${laser('beam')}${sound('buzz')}${obstacle('box', 'box', 0.3)}
      <div class="c-lz-panel">
        <div class="c-lz-row" style="top:3px">A0 <span style="color:#0066ff" data-k="read"></span></div>
        <div class="c-lz-track"><div class="c-lz-fill"></div></div>
        <div class="c-lz-mark"></div>
      </div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    view.part<Laser>('LZ1').laserOn = true;
    const laser = view.box('LZ1');
    const ldr = view.box('K1');
    const beamX = laser.x + laser.w / 2;
    const beamTop = laser.y + laser.h - 4;
    const ldrY = ldr.y + 12;

    const left = boxLeft(t);
    placeObstacle(view, 'box', left, BOX.y);
    // How much of the 6 px beam the box covers, 0..1.
    const cover = clamp((left + BOX.w - (beamX - 3)) / 6) * clamp((beamX + 3 - left) / 6);
    const blocked = cover > 0.5;
    setLaser(view, 'beam', { x: beamX, y: beamTop }, { x: beamX, y: blocked ? BOX.y : ldrY }, 1, 1 - cover);

    // The sketch acts on the A0 reading it took at the start of the current 50 ms loop.
    const reading = (at: number) => {
      const c = clamp((boxLeft(at) + BOX.w - (beamX - 3)) / 6) * clamp((beamX + 3 - boxLeft(at)) / 6);
      return Math.round(lerp(LIT, DARK, c));
    };
    const tick = Math.floor(t / LOOP_MS) * LOOP_MS;
    const value = reading(tick);
    view.q<HTMLElement>('[data-k="read"]').textContent = String(value);
    view.q<HTMLElement>('.c-lz-fill').style.width = `${(100 * value) / 1023}%`;
    if (value > THRESHOLD) view.glowWire('w-A0-S', 1);

    const alarm = value > THRESHOLD;
    view.part<Buzzer>('BZ1').hasSignal = alarm;
    if (alarm) view.glowWire('w-3-BZ1', 1);
    view.glowWire('w-8-signal', 1);
    const buzzer = view.box('BZ1');
    setSound(view, 'buzz', { x: buzzer.x + buzzer.w / 2, y: buzzer.y + buzzer.w / 2 }, alarm ? t / 250 : null, { dir: 'right', from: 36, to: 76 });
  },
};

export default buzzerLaserTripwire;
