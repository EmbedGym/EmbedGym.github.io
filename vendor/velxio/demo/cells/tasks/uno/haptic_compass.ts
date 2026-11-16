import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { BLUE_TINT } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { setVibration, vibration } from '../../decor/vibration';
import { DURATION, EFFECT_MS, READS, headingAt, show } from '../mega/haptic_compass';

type Haptic = HTMLElement & { vibrating: boolean };

const BOARD = 'arduino-uno';
const MAG_WIRES = ['w-A4-MAG1-SDA', 'w-A5-MAG1-SCL'];
const HAP_WIRES = ['w-A4-HAP1-SDA', 'w-A5-HAP1-SCL'];
// loop(): delay(67) plus the I2C reads.
const POLL_MS = 70;

const SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * The sketch's sector changes for the shared turns, sampled every `pollMs`: a new
 * sector is entered once the heading is within 17.5° of its centre (5° past the boundary).
 */
export function sectorEntries(pollMs: number) {
  const sectorOf = (h: number) => Math.floor((h + 22.5) / 45) % 8;
  let current = sectorOf(show(headingAt(0)));
  const entries: { t: number; sector: string; effect: string }[] = [];
  for (let t = pollMs; t < DURATION; t += pollMs) {
    const h = show(headingAt(t));
    const candidate = sectorOf(h);
    let diff = h - candidate * 45;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (candidate !== current && Math.abs(diff) <= 17.5) {
      current = candidate;
      entries.push({ t, sector: SECTORS[current], effect: current === 0 ? 'buzz' : 'click' });
    }
  }
  return entries;
}

/** The loop's serial lines; the previous loop's are already on screen at t=0. */
export function compassPrints(entries: { t: number; sector: string }[]): Print[] {
  const sectorAt = (t: number) => [...entries].reverse().find((e) => e.t <= t)?.sector ?? entries[entries.length - 1].sector;
  const loop: Print[] = [
    ...READS.map((r) => ({ t: r + 2, text: `Heading: ${show(headingAt(r)).toFixed(1)} Sector: ${sectorAt(r)}` })),
    ...entries.map((e) => ({ t: e.t + 1, text: `Entered ${e.sector}` })),
  ].sort((a, b) => a.t - b.t);
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}

const ENTRIES = sectorEntries(POLL_MS);
const PRINTS = compassPrints(ENTRIES);
const sectorAt = (t: number) => [...ENTRIES].reverse().find((e) => e.t <= t)?.sector ?? ENTRIES[ENTRIES.length - 1].sector;

const SERIAL = { x: -300, y: 35, w: 280, h: 158 };
const PANEL = { x: -204, y: 232, w: 280, h: 132 };
const DIAL = { cx: 52, cy: 66 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.uno, wrap: true })}
      <div class="c-hcu-panel" style="position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px;background:#f8fafc;border:1.5px solid #cfd6df;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,0.08)">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('heading', { pointer: 'needle', sectors: true, hysteresis: 5 })}</div>
        <div style="position:absolute;right:10px;top:4px;font:600 24px var(--sans);color:var(--muted)">MAG1 heading</div>
        <div class="c-hcu-sector" style="position:absolute;left:118px;top:42px;padding:0 8px;border-radius:8px;font:700 32px/44px var(--mono);color:var(--accent);background:${BLUE_TINT}"></div>
        <div class="c-hcu-effect" style="position:absolute;left:118px;top:92px;padding:0 6px;border-radius:8px;font:700 26px/36px var(--sans);color:#fff;background:var(--accent)"></div>
      </div>
      <div class="c-hcu-motor" style="position:absolute">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, SERIAL.y, 304, PANEL.y + PANEL.h],
  },
  activity: [
    { wires: MAG_WIRES, at: [...READS, ...ENTRIES.map((e) => e.t)] },
    { wires: HAP_WIRES, at: ENTRIES.map((e) => e.t + 2) },
  ],
  run(t, view) {
    const sector = sectorAt(t);
    setDial(view, 'heading', { angle: headingAt(t), sector });
    view.q<HTMLElement>('.c-hcu-sector').textContent = sector;

    // The effect's name stays up for a second after it plays; the motor runs for its 100 ms.
    const entry = [...ENTRIES].reverse().find((e) => e.t <= t);
    const since = entry ? t - entry.t : Infinity;
    const label = view.q<HTMLElement>('.c-hcu-effect');
    label.textContent = entry?.effect ?? '';
    label.style.opacity = String(since < 1000 ? 1 - clamp((since - 700) / 300) : 0);

    const buzzing = since < EFFECT_MS;
    view.part<Haptic>('HAP1').vibrating = buzzing;
    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-hcu-motor');
    motor.style.left = `${hap.x + hap.w / 2}px`;
    motor.style.top = `${hap.y + hap.h - 20}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;
