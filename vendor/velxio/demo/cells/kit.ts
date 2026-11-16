// Artwork shared by cells, so every card draws a serial monitor the same way.
// Pictures of real-world things live in ./decor. Each piece is HTML for `decor` plus a function `run`
// calls each frame; `key` tells two of a kind apart.

import { clamp, easeOutCubic, sinceLast } from './anim';
import type { CellView, Rect } from './cell';

type Point = { x: number; y: number };

/** A board's USB socket that carries its serial console: the socket's outer edge, in cell coordinates, and which way it opens. */
export interface UsbPort extends Point {
  opens: 'left' | 'down';
}

/** Per cells/boards.json key. */
export const USB = {
  mega: { x: 0, y: 57.8, opens: 'left' },
  uno: { x: 0, y: 57.8, opens: 'left' },
  // The UART socket: the console is on UART0, not the S3's native USB beside it.
  esp32s3: { x: 30.5, y: 350, opens: 'down' },
  // The interface MCU's socket, whose virtual COM port carries the console.
  nrf52840: { x: 0, y: 121, opens: 'left' },
} satisfies Record<string, UsbPort>;

export interface Print {
  /** When the line's newline goes out, ms. */
  t: number;
  text: string;
}

/**
 * A serial monitor. `cableTo` runs a USB cable from the panel to that board's
 * socket (a `USB` entry): for a socket opening left, from the panel's right side,
 * level with the socket; for one opening down, from the panel's top when the
 * panel is under the socket, else from its side below the socket's level, else
 * (a panel ending above the plug) from its bottom round under the plug; each
 * turns up into the socket. `wrap` breaks a line too long for the panel onto
 * further rows, indented, instead of widening the panel. `fontSize` (default
 * 25) is the lines' text size; a row is 1.36 times it.
 */
export function serialPanel(
  key: string,
  rect: Rect,
  opts: { title?: string; note?: string; cableTo?: UsbPort; wrap?: boolean; fontSize?: number } = {},
): string {
  const { title = 'Serial monitor', note = '', cableTo, wrap = false, fontSize = 25 } = opts;
  let cable = '';
  if (cableTo?.opens === 'left') {
    const x0 = rect.x + rect.w;
    if (cableTo.x <= x0) throw new Error(`serial ${key}: the socket must be right of the panel`);
    if (cableTo.y < rect.y || cableTo.y > rect.y + rect.h) throw new Error(`serial ${key}: the panel must span the socket's height`);
    cable = `
      <svg class="cell-air k-cable" viewBox="0 0 10 10">
        <path d="M ${x0} ${cableTo.y} H ${cableTo.x - 12}" />
        <rect x="${cableTo.x - 14}" y="${cableTo.y - 10}" width="16" height="20" rx="3" />
      </svg>`;
  } else if (cableTo?.opens === 'down') {
    const y1 = cableTo.y + 12;
    let d: string;
    if (rect.x < cableTo.x && cableTo.x < rect.x + rect.w) {
      if (rect.y <= y1) throw new Error(`serial ${key}: the panel must be below the socket`);
      d = `M ${cableTo.x} ${rect.y} V ${y1}`;
    } else {
      const x0 = rect.x + rect.w < cableTo.x ? rect.x + rect.w : rect.x;
      const bottom = rect.y + rect.h;
      const y0 = rect.y + 24 > y1 + 12 ? rect.y + 24 : y1 + 24;
      if (y0 <= bottom - 12) {
        d = `M ${x0} ${y0} H ${cableTo.x} V ${y1}`;
      } else {
        // The panel ends above the plug: leave its bottom on the socket's side and come up from below.
        const xb = x0 === rect.x ? rect.x + 16 : rect.x + rect.w - 16;
        d = `M ${xb} ${bottom} V ${Math.max(bottom, y1) + 20} H ${cableTo.x} V ${y1}`;
      }
    }
    cable = `
      <svg class="cell-air k-cable" viewBox="0 0 10 10">
        <path d="${d}" />
        <rect x="${cableTo.x - 10}" y="${cableTo.y - 2}" width="20" height="16" rx="3" />
      </svg>`;
  } else if (cableTo !== undefined) {
    throw new Error(`serial ${key}: unknown socket direction`);
  }
  return `
    ${cable}
    <div class="k-serial" data-serial="${key}"${wrap ? ' data-wrap' : ''} style="left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px;--k-font:${fontSize}px">
      <div class="k-serial-head"><span>${title}</span><span class="k-serial-note">${note}</span></div>
      <div class="k-serial-window"><div class="k-serial-lines"></div></div>
    </div>`;
}

/**
 * Shows what has printed by `t`, newest at the bottom, the latest fading in
 * highlighted, and blinks `board`'s TX LED as each line goes out. Only lines
 * that fit whole are shown. Lines fade out from `fadeFrom` so the loop
 * restarts on an empty monitor.
 */
export function showSerial(
  view: CellView,
  key: string,
  t: number,
  prints: Print[],
  opts: { board?: string; fadeFrom?: number } = {},
) {
  const panel = view.q<HTMLElement>(`[data-serial="${key}"]`);
  const viewport = panel.querySelector('.k-serial-window') as HTMLElement;
  const lines = panel.querySelector('.k-serial-lines') as HTMLElement;
  const done = prints.filter((p) => p.t <= t);
  const since = sinceLast(
    t,
    done.map((p) => p.t),
  );
  lines.innerHTML = done
    .slice(-12)
    .map((p, i, shown) => {
      const fresh = i === shown.length - 1 ? clamp(1 - since / 700) : 0;
      return `<div class="k-serial-line" style="--fresh:${fresh}">${p.text}</div>`;
    })
    .join('');
  // Half a px of slack for rows whose height is fractional.
  const fits = () => lines.getBoundingClientRect().height <= viewport.getBoundingClientRect().height + 0.5;
  while (lines.childElementCount > 1 && !fits()) lines.firstElementChild!.remove();
  // Fading in place, not sliding up from below the window, so no line is ever cut off.
  const newest = lines.lastElementChild as HTMLElement | null;
  if (newest && done.length) newest.style.opacity = String(easeOutCubic(clamp(since / 180)));
  lines.style.opacity = String(opts.fadeFrom === undefined ? 1 : 1 - clamp((t - opts.fadeFrom) / 300));
  if (opts.board) {
    const board = view.part<HTMLElement & { ledTX: boolean }>(opts.board);
    board.ledTX = since < 90;
  }
}

/**
 * The centre of key `name` on membrane keypad `id`, in cell coordinates, read
 * from the rendered element so it follows the keypad's own layout.
 */
export function keypadKey(view: CellView, id: string, name: string): Point {
  const root = view.part(id).shadowRoot!;
  const key = root.querySelector(`[data-key-name="${name}"]`)!.getBoundingClientRect();
  // The host element's own rectangle is not the drawing's; its svg is.
  const r = root.querySelector('svg')!.getBoundingClientRect();
  const box = view.box(id);
  const k = box.w / r.width;
  return { x: box.x + (key.left + key.width / 2 - r.left) * k, y: box.y + (key.top + key.height / 2 - r.top) * k };
}
