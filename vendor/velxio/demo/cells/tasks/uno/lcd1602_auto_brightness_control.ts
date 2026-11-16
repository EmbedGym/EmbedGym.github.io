import type { Cell } from '../../cell';
import { setSun, sun } from '../../decor/sky';
import { CHANGES, DURATION, SCREEN, dutyAt, lightAt } from '../mega/lcd1602_auto_brightness_control';

// | board       | arduino-uno                               |
// | LCD bus     | w-12-RS, w-11-E, w-4-D4 … w-7-D7          |
// | backlight   | w-10-A (PWM on D10)                       |
// | KY-018 S    | w-A2-S                                    |

type Lcd = HTMLElement & { text: string; backlight: boolean };

const LCD_BUS = ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'];
// Cell coordinates: the KY-018 spans x 289..344, y 132..194; the sun sits above it.
const SUN = { x: 314, y: 90, scale: 0.68 };
const SUN_R = 46 * SUN.scale;
// LCD1 is turned 90° clockwise, so the element's screen rect turns with it.
const LCD_H = 136;
// LCD1's two rows again, upright, beside it: the turned LCD reads top to bottom.
const READ = { x: 522, y: -25, w: 180, h: 76 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-abcu-dim { position: absolute; background: #000; border-radius: ${SCREEN.r}px; pointer-events: none; }
        .c-abcu-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 27px/32px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
        .c-abcu-read-dim { position: absolute; inset: 0; background: #000; pointer-events: none; }
      </style>
      <div class="c-abcu-dim"></div>
      <div class="c-abcu-read"><span class="c-abcu-read-text"></span><div class="c-abcu-read-dim"></div></div>
      ${sun('s', { scale: SUN.scale })}`,
    bounds: [SUN.x - SUN_R, READ.y, READ.x + READ.w, SUN.y + SUN_R],
  },
  setup(view) {
    const lcd = view.box('LCD1');
    Object.assign(view.q<HTMLElement>('.c-abcu-dim').style, {
      left: `${lcd.x + LCD_H - SCREEN.y - SCREEN.h}px`,
      top: `${lcd.y + SCREEN.x}px`,
      width: `${SCREEN.h}px`,
      height: `${SCREEN.w}px`,
    });
  },
  run(t, view) {
    const k = lightAt(t) / 1023;
    setSun(view, 's', SUN, { brightness: k });

    const duty = dutyAt(t);
    const lcd = view.part<Lcd>('LCD1');
    lcd.backlight = true;
    const dim = String(0.5 * (1 - duty / 255));
    view.q<HTMLElement>('.c-abcu-dim').style.opacity = dim;
    view.q<HTMLElement>('.c-abcu-read-dim').style.opacity = dim;
    lcd.text = 'Backlight:'.padEnd(16, ' ') + String(duty).padEnd(16, ' ');
    view.q<HTMLElement>('.c-abcu-read-text').textContent = `Backlight:\n${duty}`;
    view.glowWire('w-10-A', duty / 255);
    // S falls as the light rises.
    view.glowWire('w-A2-S', 1 - k);
  },
  activity: [{ wires: LCD_BUS, at: CHANGES }],
};

export default cell;
