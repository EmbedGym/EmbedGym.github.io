import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { BLUE_TINT } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { setVibration, vibration } from '../../decor/vibration';
import { DURATION, EFFECT_MS, READS, headingAt } from '../mega/haptic_compass';
import { compassPrints, sectorEntries } from '../uno/haptic_compass';

type Haptic = HTMLElement & { vibrating: boolean };

const BOARD = 'nrf52840-dk';
const MAG_WIRES = ['w-P0.21-MAG1-SDA', 'w-P0.27-MAG1-SCL'];
const HAP_WIRES = ['w-P0.21-HAP1-SDA', 'w-P0.27-HAP1-SCL'];
// main() polls every POLL_MS = 50 and prints every 20th poll.
const POLL_MS = 50;

const ENTRIES = sectorEntries(POLL_MS);
const PRINTS = compassPrints(ENTRIES);
const sectorAt = (t: number) => [...ENTRIES].reverse().find((e) => e.t <= t)?.sector ?? ENTRIES[ENTRIES.length - 1].sector;

// The modules sit left of the board, wired up its left edge, so the panel and
// the monitor share one column left of them, set large for the wide card.
const FONT = 32;
const SERIAL = { x: -445, y: 92, w: 385, h: 34 + 3 * FONT * 1.36 + 10 };
const ZOOM = 1.25;
const PANEL = { x: -445, y: -100, w: 220, h: 146 };
// The breakout is turned 270°, so the motor disc is on its left and the arcs go above and below it.
const MOTOR = { dx: 20, dy: 48 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: FONT })}
      <div style="position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px;transform:scale(${ZOOM});transform-origin:0 0;background:#f8fafc;border:1.5px solid #cfd6df;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,0.08)">
        <div style="position:absolute;left:12px;top:6px;font:600 26px var(--sans);color:var(--muted);white-space:nowrap">MAG1 heading</div>
        <div style="position:absolute;left:58px;top:90px">${dial('heading', { pointer: 'needle', sectors: true, hysteresis: 5 })}</div>
        <div class="c-hcn-sector" style="position:absolute;left:118px;top:44px;padding:0 8px;border-radius:8px;font:700 32px/44px var(--mono);color:var(--accent);background:${BLUE_TINT}"></div>
        <div class="c-hcn-effect" style="position:absolute;left:118px;top:100px;padding:0 6px;border-radius:8px;font:700 26px/36px var(--sans);color:#fff;background:var(--accent)"></div>
      </div>
      <div class="c-hcn-motor" style="position:absolute;transform:rotate(90deg)">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, PANEL.y, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
  },
  activity: [
    { wires: MAG_WIRES, at: [...READS, ...ENTRIES.map((e) => e.t)] },
    { wires: HAP_WIRES, at: ENTRIES.map((e) => e.t + 2) },
  ],
  run(t, view) {
    const sector = sectorAt(t);
    setDial(view, 'heading', { angle: headingAt(t), sector });
    view.q<HTMLElement>('.c-hcn-sector').textContent = sector;

    // The effect's name stays up for a second after it plays; the motor runs for its 100 ms.
    const entry = [...ENTRIES].reverse().find((e) => e.t <= t);
    const since = entry ? t - entry.t : Infinity;
    const label = view.q<HTMLElement>('.c-hcn-effect');
    label.textContent = entry?.effect ?? '';
    label.style.opacity = String(since < 1000 ? 1 - clamp((since - 700) / 300) : 0);

    const buzzing = since < EFFECT_MS;
    view.part<Haptic>('HAP1').vibrating = buzzing;
    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-hcn-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;
