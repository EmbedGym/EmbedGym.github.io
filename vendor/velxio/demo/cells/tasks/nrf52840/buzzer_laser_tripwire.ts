import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { laser, setLaser } from '../../decor/laser';
import { obstacle, obstacleSize, placeObstacle } from '../../decor/obstacle';
import { setSound, sound } from '../../decor/sound';

type Laser = HTMLElement & { laserOn: boolean };
type Buzzer = HTMLElement & { hasSignal: boolean };

// main.c reads P0.03 (AIN1) in mV every 50 ms and toggles P1.15 every 250 µs (2 kHz) above 1900 mV.
const WIRES = { laser: 'w-P1.12-signal', light: 'w-P0.03-S', buzzer: 'w-P1.15-BZ1' };

const DURATION = 4000;
const SLIDE_IN = 800;
const SLIDE_OUT = 2600;
const SLIDE_MS = 300;
const LOOP_MS = 50;
const FULL_MV = 3300;
const THRESHOLD_MV = 1900;
// test.jsonl's light levels 900 (beam on the LDR) and 100 (beam blocked) on K1's 3.3 V divider.
const LIT_MV = 397;
const DARK_MV = 2977;

// The laser points left at K1's LDR; the box drops into the beam from above, between them.
const BOX_SCALE = 0.45;
const BOX = { ...obstacleSize('box', BOX_SCALE), x: -154, fromY: 85, toY: 107 };
// The reading panel sits above K1 and the box.
// The card's scale is low (parts above and below both headers), so the panel text is drawn larger.
const FONT = 30;
const PANEL = { x: -342, y: -80, w: 232, h: 150 };
const BAR = { x: 18, y: 88, w: 196, h: 14 };
const MARK_X = BAR.x + (BAR.w * THRESHOLD_MV) / FULL_MV;

function boxTop(t: number) {
  const p = easeInOutCubic(clamp((t - SLIDE_IN) / SLIDE_MS)) - easeInOutCubic(clamp((t - SLIDE_OUT) / SLIDE_MS));
  return lerp(BOX.fromY, BOX.toY, p);
}

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-lzn-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-lzn-title { position: absolute; left: 18px; font: 700 ${FONT}px/1.2 var(--sans); color: var(--ink); white-space: nowrap; }
        .c-lzn-row { position: absolute; left: 18px; font: 700 ${FONT}px/1.2 var(--mono); color: var(--ink); white-space: nowrap; }
        .c-lzn-track { position: absolute; border-radius: 5px; background: #f1f3f6; border: 1.5px solid #e2e6ec; overflow: hidden; }
        .c-lzn-fill { height: 100%; background: #0066ff; }
        .c-lzn-mark { position: absolute; width: 2px; background: #64748b; }
        .c-lzn-tag { position: absolute; font: 700 ${FONT}px/1 var(--mono); color: #64748b; white-space: nowrap; }
      </style>
      ${laser('beam')}${sound('buzz')}${obstacle('box', 'box', BOX_SCALE)}
      <div class="c-lzn-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-lzn-title" style="top:6px">K1 light, mV</div>
        <div class="c-lzn-row" style="top:44px">P0.03 <span style="color:#0066ff" data-k="read"></span></div>
        <div class="c-lzn-track" style="left:${BAR.x}px;top:${BAR.y}px;width:${BAR.w}px;height:${BAR.h}px"><div class="c-lzn-fill"></div></div>
        <div class="c-lzn-mark" style="left:${MARK_X - 1}px;top:${BAR.y - 5}px;height:${BAR.h + 10}px"></div>
        <div class="c-lzn-tag" style="left:${MARK_X - 36}px;top:${BAR.y + 20}px">1900</div>
      </div>`,
    bounds: [PANEL.x, -125, 200, 280],
  },
  run(t, view) {
    view.part<Laser>('LZ1').laserOn = true;
    const laserBox = view.box('LZ1');
    const ldr = view.box('K1');
    const beamY = laserBox.y + laserBox.h / 2;
    const beamFrom = laserBox.x + 4;
    const ldrX = ldr.x + ldr.w / 2;

    // How much of the 6 px beam the box covers at time `at`, 0..1.
    const cover = (at: number) => {
      const top = boxTop(at);
      return clamp((top + BOX.h - (beamY - 3)) / 6) * clamp((beamY + 3 - top) / 6);
    };
    const now = cover(t);
    placeObstacle(view, 'box', BOX.x, boxTop(t));
    setLaser(view, 'beam', { x: beamFrom, y: beamY }, { x: now > 0.5 ? BOX.x + BOX.w : ldrX, y: beamY }, 1, 1 - now);
    view.glowWire(WIRES.laser, 1);

    // main.c acts on the reading it took at the start of the current 50 ms loop.
    const mv = Math.round(lerp(LIT_MV, DARK_MV, cover(Math.floor(t / LOOP_MS) * LOOP_MS)));
    view.q<HTMLElement>('[data-k="read"]').textContent = `${mv}`;
    view.q<HTMLElement>('.c-lzn-fill').style.width = `${(100 * mv) / FULL_MV}%`;

    // The S wire's halo follows its voltage.
    view.glowWire(WIRES.light, mv / FULL_MV);

    const alarm = mv > THRESHOLD_MV;
    view.part<Buzzer>('BZ1').hasSignal = alarm;
    if (alarm) view.glowWire(WIRES.buzzer, 1);
    const buzzer = view.box('BZ1');
    setSound(view, 'buzz', { x: buzzer.x + buzzer.w / 2, y: buzzer.y + buzzer.w / 2 }, alarm ? t / 250 : null, { dir: 'left', from: 36, to: 76 });
  },
};

export default cell;
