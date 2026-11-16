import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { setSun, sun } from '../../decor/sky';

type Lcd = HTMLElement & { text: string; backlight: boolean };

// The room light changes; every 100 ms the sketch reads the KY-018 and sets the backlight
// PWM to match: brighter room, brighter backlight. The LCD prints the duty (0-255).
export const DURATION = 6000;
export const STEPS = [
  { at: 0, level: 500 },
  { at: 1500, level: 200 },
  { at: 3000, level: 800 },
  { at: 4500, level: 500 },
];
export const RAMP = 400;
export const POLL = 100;

export function lightAt(t: number) {
  let level = STEPS[0].level;
  for (const step of STEPS.slice(1)) level = lerp(level, step.level, easeInOutCubic(progress(t, step.at, RAMP)));
  return level;
}
// S = VCC x (1 - level/1023), so 1023 - analogRead is the light level itself.
export const dutyAt = (t: number) => Math.trunc((Math.round(lightAt(Math.floor(t / POLL) * POLL)) * 255) / 1023);
// The sketch rewrites row 1 every 100 ms; the bus glows only when the number changes.
export const CHANGES: number[] = [];
for (let t = POLL; t < DURATION; t += POLL) if (dutyAt(t) !== dutyAt(t - POLL)) CHANGES.push(t);

// The element's own backlight-off overlay: its screen rect (7.55, 10.3) mm, 66 x 16 mm, at 3.78 px/mm.
export const MM = 302.4 / 80;
export const SCREEN = { x: 7.55 * MM, y: 10.3 * MM, w: 66 * MM, h: 16 * MM, r: 1.5 * MM };
// Cell coordinates: the KY-018 spans x 245..307, y 211..266; the GND lane runs down x 400 and along y 276.
const SUN = { x: 352, y: 236, scale: 0.68 };
const SUN_R = 46 * SUN.scale;

const autoBrightness: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-abc-dim { position: absolute; background: #000; border-radius: ${SCREEN.r}px; pointer-events: none; }
      </style>
      <div class="c-abc-dim"></div>
      ${sun('s', { scale: SUN.scale })}`,
    bounds: [SUN.x - SUN_R, SUN.y - SUN_R, SUN.x + SUN_R, SUN.y + SUN_R],
  },
  setup(view) {
    const lcd = view.box('LCD1');
    const dim = view.q<HTMLElement>('.c-abc-dim');
    Object.assign(dim.style, {
      left: `${lcd.x + SCREEN.x}px`,
      top: `${lcd.y + SCREEN.y}px`,
      width: `${SCREEN.w}px`,
      height: `${SCREEN.h}px`,
    });
  },
  run(t, view) {
    const k = lightAt(t) / 1023;
    setSun(view, 's', SUN, { brightness: k });

    const duty = dutyAt(t);
    const lcd = view.part<Lcd>('LCD1');
    lcd.backlight = true;
    view.q<HTMLElement>('.c-abc-dim').style.opacity = String(0.5 * (1 - duty / 255));
    lcd.text = 'Backlight:'.padEnd(16, ' ') + String(duty).padEnd(16, ' ');
    view.glowWire('w-10-A', duty / 255);
    view.glowWire('w-A2-S', 1 - k);
  },
  activity: [{ wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: CHANGES }],
};

export default autoBrightness;
