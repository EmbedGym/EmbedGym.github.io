// A task's animated cell: its circuit.ts drawn as a tidy picture, plus a
// scripted animation of the task working. The layout is circuit.ts itself —
// parts where the canvas puts them, wires along their waypoints — so a cell
// file holds only what the circuit cannot: the animation and its artwork.
//
// Cell coordinates are canvas pixels shifted so the board's top-left is (0, 0).

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CellView {
  /** The live element of a board or component, by its circuit.ts id. */
  part<T = HTMLElement>(id: string): T;
  /** That element's rectangle, in cell coordinates. */
  box(id: string): Rect;
  /** A pin's position, in cell coordinates. */
  pin(id: string, name: string): { x: number; y: number };
  q<T = Element>(selector: string): T;
  qa<T = Element>(selector: string): T[];
  /** Lights a wire's halo this frame (0..1), e.g. while its signal is high; `activity` flashes add to it. */
  glowWire(id: string, amount: number): void;
}

/**
 * Something the demo shows but the graded circuit does not have, such as the
 * lamp a relay switches. It is not in circuit.ts, so the task page's canvas
 * never shows it.
 */
export interface ExtraPart {
  id: string;
  /** Element top-left, in cell coordinates. */
  x: number;
  y: number;
  /** A real element; its pins come from its pinInfo… */
  tag?: string;
  attrs?: Record<string, string>;
  props?: Record<string, unknown>;
  /** …or inline artwork, with its pins named relative to its top-left. */
  html?: string;
  pins?: Record<string, { x: number; y: number }>;
}

export interface ExtraWire {
  /** Optional, so `activity` can name it. */
  id?: string;
  /** [part id, pin name]; the part may be a circuit part or an extra. */
  from: [string, string];
  to: [string, string];
  color: string;
  /** Route corners in cell coordinates; a diagonal step turns horizontal-then-vertical, as on the canvas. */
  via?: { x: number; y: number }[];
}

export interface Cell {
  /** Loop length, ms. */
  duration: number;
  extras?: { parts?: ExtraPart[]; wires?: ExtraWire[] };
  /**
   * Artwork drawn over the parts: props, a serial panel, a hand… `bounds`
   * ([x0, y0, x1, y1], cell coordinates) makes the frame fit it too.
   */
  decor?: { html: string; bounds?: [number, number, number, number] };
  /** Runs once after layout: position decor from view.box / view.pin here. */
  setup?(view: CellView): void;
  /**
   * Sets every animated element for time `t` (ms since power-on, 0 <= t < duration).
   * A pure function of t: no timers, CSS animations or unseeded randomness.
   */
  run(t: number, view: CellView): void;
  /** Wires (circuit.ts or extra wire ids) that flash with bus activity, at the given times. */
  activity?: { wires: string[]; at: number[] }[];
}
