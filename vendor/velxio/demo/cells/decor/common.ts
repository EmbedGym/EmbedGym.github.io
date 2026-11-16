// The decor library: pictures of real-world things the cells show beside the
// circuit (a finger, the sun, a 12 V battery). Each kind is drawn once, here,
// so every card draws it the same way. Colours come from this palette.

import type { CellView } from '../cell';

/** What a decor setter may touch: the cell's DOM, nothing of its circuit. */
export type DecorView = Pick<CellView, 'q' | 'qa'>;

/** One example of a decor entry, as the /decor gallery shows it. */
export interface DecorSample {
  name: string;
  /** The gallery box, px; `html` is placed at its top-left. */
  w: number;
  h: number;
  html: string;
  /** Loop length for `play`, ms. */
  duration?: number;
  play?: (view: DecorView, t: number) => void;
}

let serial = 0;

/**
 * A document-wide unique SVG id. /tasks puts every cell in one document, so an
 * id built from a cell's own key would collide with another cell's.
 */
export function uid(name: string): string {
  return `d-${name}-${++serial}`;
}

export const INK = '#475569';
export const MUTED = '#94a3b8';

export const SKIN = '#f2c7a5';
export const SKIN_EDGE = '#c9946d';
export const NAIL = '#fbe4d6';
export const NAIL_EDGE = '#dcae8c';

export const METAL = '#c3c9d1';
export const METAL_EDGE = '#8b95a1';
export const METAL_LIGHT = '#d7dce2';

export const PLASTIC_DARK = '#2f3640';
export const PLASTIC_DARK_EDGE = '#161b22';
export const BRASS = '#d9a520';
export const BRASS_EDGE = '#9c7410';
export const GOLD = '#f5c518';

export const CARDBOARD = '#d9b382';
export const CARDBOARD_EDGE = '#9c7444';
export const CARDBOARD_TAPE = '#e9cfa6';
export const WOOD = '#b08a5a';
export const WOOD_EDGE = '#7c5a2a';

export const GLASS = 'rgba(226, 238, 248, 0.25)';
export const WATER = 'rgba(56, 132, 230, 0.42)';
export const WATER_SURFACE = '#2b6fd6';

export const FLAME = '#f59e0b';
export const FLAME_CORE = '#fde68a';
export const WARM = '#f97316';
export const WARM_EDGE = '#c2410c';
export const WARM_GLOW = 'rgba(249, 115, 22, 0.35)';

export const SMOKE = '#9ca3af';
export const GAS = '#a3b18a';
export const STEAM = '#c0c7d1';
export const COFFEE = '#7c2d12';
export const ICE = '#f8fafc';
export const ICE_EDGE = '#93c5fd';
export const ICE_WATER = '#bfdbfe';
export const ICE_GLASS = '#dbeafe';
export const RED_EDGE = '#a61e1e';

export const SUN = '#ffc83d';
export const SUN_EDGE = '#f5a400';
export const SUN_RAY = '#f5b400';
export const UV = '#8b5cf6';
export const CLOUD = '#eef2f7';
export const CLOUD_EDGE = '#9aa6b5';

export const RED = '#e03131';
export const GREEN = '#2f9e44';
export const BLUE = '#2f7dd1';
export const BLUE_EDGE = '#1e5aa3';
export const BLUE_TINT = '#d6e4fb';
export const BLUE_LIGHT = '#9cc3ff';

/** Dark text on light decor: a battery's reading, a phone's chat. */
export const TEXT = '#0f172a';
export const CHARGE = '#4ade80';
export const CHARGE_LOW = '#f87171';
export const PHONE_BODY = '#1e293b';
export const PHONE_SCREEN = '#f8fafc';
export const PHONE_RULE = '#e2e8f0';
/** A phone's status dot while it scans for a device. */
export const SCANNING = '#f59e0b';

export const FACE = '#ffffff';
export const FACE_EDGE = '#cfd6df';

export const LASER = '#ff3b30';
export const LASER_GLOW = 'rgba(255, 59, 48, 0.28)';

export const SOUND = '#1a73e8';

export const TYRE = '#2f3640';
export const TREAD = '#59626e';
export const GEARBOX = '#f2c14e';
export const GEARBOX_EDGE = '#c99a2a';
export const GEARBOX_INK = '#5c4326';

export const COPPER_LIT = '#ffe066';
export const COPPER_EDGE = '#b88a00';

export const SALT = '#ffffff';
export const MURKY_WATER = 'rgba(150, 110, 60, 0.6)';
export const MURKY_SURFACE = '#7a5426';

export const MOON = '#7c89a8';
export const MOON_EDGE = '#56627d';
export const BREATH = '#ffe4cc';
export const BREATH_EDGE = '#fb923c';
export const LAMP_GLOW = 'rgba(255, 196, 60, 0.7)';
export const RED_GLOW = 'rgba(255, 60, 60, 0.95)';
export const MIST = '#60a5fa';
export const BOTTLE = '#e8f1f8';
export const BOTTLE_EDGE = '#8fa3b8';
