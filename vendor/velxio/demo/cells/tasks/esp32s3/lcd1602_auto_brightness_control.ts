import type { Cell } from '../../cell';
import { setSun, sun } from '../../decor/sky';
import { DURATION, POLL, SCREEN, dutyAt, lightAt } from '../mega/lcd1602_auto_brightness_control';

// | board       | esp32-s3                                   |
// | LCD bus     | w-38-RS, w-39-E, w-40-D4 … w-42-D6, w-21-D7 |
// | backlight   | w-14-A (LEDC on GPIO14)                    |
// | KY-018 S    | w-9-S (ADC1 CH8)                           |

type Lcd = HTMLElement & { text: string; backlight: boolean };

const LCD_BUS = ['w-38-RS', 'w-39-E', 'w-40-D4', 'w-41-D5', 'w-42-D6', 'w-21-D7'];
// Cell coordinates: the KY-018 spans x -125..-63, y 180..235, left of the board; the sun sits above it.
const SUN = { x: -94, y: 130, scale: 0.68 };
const SUN_R = 46 * SUN.scale;

// Every 100 ms app_main sets the cursor and rewrites row 1; each byte drives all four data lines.
const POLLS: number[] = [];
for (let t = 0; t < DURATION; t += POLL) POLLS.push(t);

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-abce-dim { position: absolute; background: #000; border-radius: ${SCREEN.r}px; pointer-events: none; }
      </style>
      <div class="c-abce-dim"></div>
      ${sun('s', { scale: SUN.scale })}`,
    bounds: [SUN.x - SUN_R, SUN.y - SUN_R, SUN.x + SUN_R, SUN.y + SUN_R],
  },
  setup(view) {
    const lcd = view.box('LCD1');
    Object.assign(view.q<HTMLElement>('.c-abce-dim').style, {
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
    view.q<HTMLElement>('.c-abce-dim').style.opacity = String(0.5 * (1 - duty / 255));
    lcd.text = 'Backlight:'.padEnd(16, ' ') + String(duty).padEnd(16, ' ');
    view.glowWire('w-14-A', duty / 255);
    // S falls as the light rises.
    view.glowWire('w-9-S', 1 - k);
  },
  activity: [{ wires: LCD_BUS, at: POLLS }],
};

export default cell;
