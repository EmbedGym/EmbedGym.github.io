import { clamp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { flame, runFlame } from '../../decor/flame';
import { puffs, runPuffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

type Led = HTMLElement & { value: boolean };
type ActiveBuzzer = HTMLElement & { sounding: boolean };
type Point = { x: number; y: number };

// A waste bin smoulders, then flares up, then is put out. Once a second the
// sketch reads the IR thermometer and the MQ2: smoke alone (≥ 1.5 × baseline)
// or heat alone (> 50 °C) is WARNING, with the LED blinking every 250 ms; both
// together are FIRE, LED steady and buzzer on. Each change is announced.
export const DURATION = 6000;
export const CHECKS = [500, 1500, 2500, 3500, 4500, 5500];
export const SMOKE: [number, number] = [700, 5100];
export const FLAME: [number, number] = [1800, 3800];
const COOL = 25.3;
const HOT = 65.4;
// MQ2 AO is 1 V clean and 2 V smoky.
export const CLEAN_VOLTS = 1;
export const SMOKY_VOLTS = 2;

type Status = 'OK' | 'WARNING' | 'FIRE';
export const inside = (t: number, [a, b]: [number, number]) => t >= a && t < b;
function statusAt(check: number): Status {
  const smoky = inside(check, SMOKE);
  const hot = inside(check, FLAME);
  if (smoky && hot) return 'FIRE';
  return smoky || hot ? 'WARNING' : 'OK';
}
export const lastCheck = (t: number) => Math.max(...CHECKS.filter((c) => c <= t), CHECKS[CHECKS.length - 1] - DURATION);
export const status = (t: number) => statusAt(lastCheck(t) < 0 ? lastCheck(t) + DURATION : lastCheck(t));

// `changeFirst`: the sketch announces a change before that check's reading.
export function printsFor(raw: (volts: number) => number, changeFirst = true): Print[] {
  const clean = raw(CLEAN_VOLTS);
  const smoky = raw(SMOKY_VOLTS);
  const loopPrints = CHECKS.flatMap((c, i) => {
    const now = statusAt(c);
    const before = statusAt(CHECKS[(i + CHECKS.length - 1) % CHECKS.length]);
    const temp = (inside(c, FLAME) ? HOT : COOL).toFixed(1);
    const smoke = inside(c, SMOKE) ? smoky : clean;
    const line = { t: c + 6, text: `Temp: ${temp} C Smoke: ${smoke} Status: ${now}` };
    if (now === before) return [line];
    const change = { t: c + 2, text: `STATUS CHANGED TO ${now}` };
    return changeFirst ? [change, line] : [{ ...line, t: c + 2 }, { ...change, t: c + 6 }];
  });
  // The previous loop's lines are already on screen at t=0, matching the end state.
  return [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
}
const PRINTS = printsFor((volts) => Math.floor((volts * 1024) / 5));
const PANEL = { x: -350, y: -80, w: 330, h: 241 };
const BIN = { x: -80, y: 189 };
const PUFFS = 10;

const binSvg = `
  <svg viewBox="0 0 70 80" width="70" height="80" style="overflow:visible">
    <path d="M 4 28 L 66 28 L 58 80 L 12 80 Z" fill="#6b7280" />
    <rect x="0" y="22" width="70" height="8" rx="3" fill="#4b5563" />
    <path d="M 22 38 L 24 72 M 35 38 L 35 72 M 48 38 L 46 72" stroke="#565e6a" stroke-width="3" />
  </svg>`;

// The blaze's size, 0..1, fading in and out over 250 ms.
export const flareAt = (t: number) => (inside(t, FLAME) ? clamp((t - FLAME[0]) / 250) * clamp((FLAME[1] - t) / 250) : 0);

// A 70 × 80 waste bin at `bin` with its blaze and smoke puffs.
export const fireHtml = (key: string, bin: Point) => `
      ${puffs(key, PUFFS, 'smoke')}
      <div style="position:absolute;left:${bin.x + 30}px;top:${bin.y + 31}px">${flame(key, { kind: 'blaze' })}</div>
      <div style="position:absolute;left:${bin.x}px;top:${bin.y}px">${binSvg}</div>`;

export type FireWires = { led: string[]; buzzer: string[]; smoke: string[] };

// Smoke leaves the bin and drifts over the MQ2's head (`head`) while it smoulders;
// the LED, buzzer and their wires follow the sketch's status.
export function runFire(view: CellView, key: string, t: number, bin: Point, head: Point, wires: FireWires) {
  runPuffs(view, key, t, {
    from: { x: bin.x + 35, y: bin.y + 20 },
    to: head,
    window: [SMOKE[0], SMOKE[1] - 700],
    flight: 1500,
    size: [7, 22],
    spread: 40,
    opacity: 0.35,
    seed: 5,
  });
  runFlame(view, key, t, flareAt(t));

  const now = status(t);
  const since = t - lastCheck(t);
  const ledOn = now === 'FIRE' || (now === 'WARNING' && Math.floor(since / 250) % 2 === 0);
  view.part<Led>('L1').value = ledOn;
  view.part<ActiveBuzzer>('BZ1').sounding = now === 'FIRE';
  if (ledOn) for (const id of wires.led) view.glowWire(id, 1);
  if (now === 'FIRE') for (const id of wires.buzzer) view.glowWire(id, 1);
  for (const id of wires.smoke) view.glowWire(id, inside(lastCheck(t), SMOKE) ? 1 : 0);
}

const fireDetector: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('fire', PANEL, { note: '115200', cableTo: USB.mega, wrap: true, fontSize: 29 })}${fireHtml('fd', BIN)}`,
    bounds: [PANEL.x, PANEL.y, 140, BIN.y + 80],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: CHECKS }],
  run(t, view) {
    const head = view.box('GAS1');
    runFire(view, 'fd', t, BIN, { x: head.x + 44.6, y: head.y + 38.5 }, { led: ['w-12-resistor', 'w-resistor-LED'], buzzer: ['w-9-BZ1'], smoke: ['w-A5-AO'] });
    showSerial(view, 'fire', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default fireDetector;
