import { clamp } from '../../anim';
import type { Cell } from '../../cell';

type Led = HTMLElement & { value: boolean };

// The sketch's SOS: 200 ms dit, 600 ms dah, 200 ms between symbols, 600 ms
// between letters, 1400 ms before the next SOS. One SOS is 6800 ms.
const DIT = 200;
const DAH = 600;
const LETTERS = ['S', 'O', 'S'];
export const MARKS: { start: number; len: number; letter: number }[] = [];
let clock = 0;
LETTERS.forEach((letter, i) => {
  for (let k = 0; k < 3; k++) {
    const len = letter === 'S' ? DIT : DAH;
    MARKS.push({ start: clock, len, letter: i });
    clock += len + DIT;
  }
  clock += i < LETTERS.length - 1 ? DAH - DIT : 7 * DIT - DIT;
});
export const DURATION = clock;

// The mark being sent (-1 between marks), the letter being sent (-1 in the
// pause after the SOS), and how far the sent marks have faded back to grey.
export function morseState(t: number) {
  const current = MARKS.findIndex((m) => t >= m.start && t < m.start + m.len);
  const started = MARKS.filter((m) => m.start <= t);
  const letter = started.length && t < MARKS[MARKS.length - 1].start + DIT * 2 ? started[started.length - 1].letter : -1;
  const lastEnd = MARKS[MARKS.length - 1].start + DIT;
  return { current, on: current >= 0, letter, reset: clamp((t - lastEnd - 500) / 600) };
}

const PANEL = { x: -206, y: -142, w: 290, h: 132 };

export function marksHtml(prefix = 'c-bm') {
  let x = 20;
  const glyphs: string[] = [];
  const labels: string[] = [];
  LETTERS.forEach((letter, i) => {
    const from = x;
    for (let k = 0; k < 3; k++) {
      const n = i * 3 + k;
      if (letter === 'S') {
        glyphs.push(`<circle class="${prefix}-mark" data-n="${n}" cx="${x + 7}" cy="64" r="7" />`);
        x += 14 + 8;
      } else {
        glyphs.push(`<rect class="${prefix}-mark" data-n="${n}" x="${x}" y="57" width="26" height="14" rx="7" />`);
        x += 26 + 8;
      }
    }
    labels.push(`<text class="${prefix}-letter" data-l="${i}" x="${(from + x - 8) / 2}" y="110" text-anchor="middle">${letter}</text>`);
    x += 14;
  });
  return glyphs.join('') + labels.join('');
}

const blinkLedMorseCode: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-bm-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-bm-head { position: absolute; left: 14px; right: 14px; top: 10px; display: flex; justify-content: space-between;
          font-size: 20px; font-weight: 700; color: var(--ink); }
        .c-bm-head span + span { color: var(--muted); font-family: var(--mono); font-weight: 400; }
        .c-bm-mark { fill: #d6dbe2; }
        .c-bm-mark.done { fill: color-mix(in srgb, #d6dbe2 calc(100% * var(--reset, 0)), #8fd18f); }
        .c-bm-mark.now { fill: #00aa00; }
        .c-bm-letter { font-family: var(--mono); font-size: 26px; font-weight: 700; fill: #b6bdc7; }
        .c-bm-letter.now { fill: var(--ink); }
      </style>
      <div class="c-bm-panel">
        <div class="c-bm-head"><span>Morse</span><span>pin 3</span></div>
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">${marksHtml()}</svg>
      </div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const { current, on, letter, reset } = morseState(t);
    view.part<Led>('L1').value = on;
    if (on) {
      view.glowWire('w-3-R1', 1);
      view.glowWire('w-R1-L1', 1);
    }
    view.qa<SVGElement>('.c-bm-mark').forEach((el) => {
      const n = Number(el.dataset.n);
      const m = MARKS[n];
      el.classList.toggle('now', n === current);
      el.classList.toggle('done', n !== current && m.start + m.len <= t);
    });
    view.q<SVGElement>('.c-bm-panel svg').style.setProperty('--reset', String(reset));
    view.qa<SVGElement>('.c-bm-letter').forEach((el) => el.classList.toggle('now', Number(el.dataset.l) === letter));
  },
};

export default blinkLedMorseCode;
