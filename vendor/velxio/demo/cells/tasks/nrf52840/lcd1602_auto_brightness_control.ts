import type { Cell } from '../../cell';
import { setSun, sun } from '../../decor/sky';
import { DURATION, POLL, SCREEN, lightAt } from '../mega/lcd1602_auto_brightness_control';

// | board       | nrf52840-dk                                          |
// | LCD bus     | w-P0.04-RS, w-P0.05-E, w-P0.02-D4, w-P0.31-D5 … D7   |
// | backlight   | w-P1.15-A (PWM_OUT0)                                 |
// | KY-018 S    | w-P0.03-S (AIN1)                                     |

type Lcd = HTMLElement & { text: string; backlight: boolean };

const LCD_BUS = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];
// Cell coordinates: the KY-018 spans x 38..100, y 323..378, under the DK's bottom-left; the sun sits left of it.
const SUN = { x: -5, y: 350, scale: 0.68 };
const SUN_R = 46 * SUN.scale;
const LCD_H = 136;
// LCD1's two rows again, upright, above it: the turned LCD reads top to bottom.
const READ = { x: 623, y: 10, w: 212, h: 90 };

// main() reads S in mV (12-bit SAADC, 3.6 V full scale) and prints 100 - mv*100/3300.
function percentAt(t: number) {
  const level = Math.round(lightAt(Math.floor(t / POLL) * POLL));
  const raw = Math.round(((3300 * (1 - level / 1023)) * 4095) / 3600);
  const mv = Math.trunc((raw * 3600) / 4095);
  return 100 - Math.trunc((Math.min(mv, 3300) * 100) / 3300);
}

// Every 100 ms main() sets the cursor and rewrites row 1; each byte drives all four data lines.
const POLLS: number[] = [];
for (let t = 0; t < DURATION; t += POLL) POLLS.push(t);

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-abcn-dim { position: absolute; background: #000; border-radius: ${SCREEN.r}px; pointer-events: none; }
        .c-abcn-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 32px/37px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
        .c-abcn-read-dim { position: absolute; inset: 0; background: #000; pointer-events: none; }
      </style>
      <div class="c-abcn-dim"></div>
      <div class="c-abcn-read"><span class="c-abcn-read-text"></span><div class="c-abcn-read-dim"></div></div>
      ${sun('s', { scale: SUN.scale })}`,
    bounds: [SUN.x - SUN_R, READ.y, READ.x + READ.w, SUN.y + SUN_R],
  },
  setup(view) {
    const lcd = view.box('LCD1');
    Object.assign(view.q<HTMLElement>('.c-abcn-dim').style, {
      left: `${lcd.x + LCD_H - SCREEN.y - SCREEN.h}px`,
      top: `${lcd.y + SCREEN.x}px`,
      width: `${SCREEN.h}px`,
      height: `${SCREEN.w}px`,
    });
  },
  run(t, view) {
    const k = lightAt(t) / 1023;
    setSun(view, 's', SUN, { brightness: k });

    const percent = percentAt(t);
    const lcd = view.part<Lcd>('LCD1');
    lcd.backlight = true;
    const dim = String(0.5 * (1 - percent / 100));
    view.q<HTMLElement>('.c-abcn-dim').style.opacity = dim;
    view.q<HTMLElement>('.c-abcn-read-dim').style.opacity = dim;
    lcd.text = 'Backlight:'.padEnd(16, ' ') + String(percent).padEnd(16, ' ');
    view.q<HTMLElement>('.c-abcn-read-text').textContent = `Backlight:\n${percent}`;
    view.glowWire('w-P1.15-A', percent / 100);
    // S falls as the light rises.
    view.glowWire('w-P0.03-S', 1 - k);
  },
  activity: [{ wires: LCD_BUS, at: POLLS }],
};

export default cell;
