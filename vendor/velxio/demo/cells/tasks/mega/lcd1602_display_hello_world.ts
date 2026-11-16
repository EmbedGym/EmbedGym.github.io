import { easeInOutCubic, progress } from '../../anim';
import type { Cell } from '../../cell';
import { USB } from '../../kit';

type Lcd = HTMLElement & { text: string };
type Mega = HTMLElement & { ledPower: boolean };

// The USB cable plugs in, setup() runs once and prints the greeting, then the cable comes out again.
export const DURATION = 4800;
export const PLUG_IN = [300, 700];
export const PLUG_OUT = [4100, 4500];
// lcd.begin + lcd.print take a few ms after boot; the bootloader holds the sketch back about 300 ms.
export const PRINTED = PLUG_IN[1] + 320;
export const BLANK = ' '.repeat(32);
export const HELLO = `  Hello World${' '.repeat(19)}`;
export const PULL = 46;

export function plugOffset(t: number) {
  if (t < PLUG_OUT[0]) return PULL * (1 - easeInOutCubic(progress(t, PLUG_IN[0], PLUG_IN[1] - PLUG_IN[0])));
  return PULL * easeInOutCubic(progress(t, PLUG_OUT[0], PLUG_OUT[1] - PLUG_OUT[0]));
}

const lcdHelloWorld: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-hw-plug { position: absolute; left: 0; top: 0; }
        .c-hw-cable { fill: none; stroke: #4b5563; stroke-width: 9; stroke-linecap: round; }
        .c-hw-boot { fill: #6b7280; stroke: #4b5563; stroke-width: 1.5; }
        .c-hw-head { fill: #c3c9d1; stroke: #8b95a1; stroke-width: 1.5; }
      </style>
      <svg class="cell-air c-hw-plug" viewBox="0 0 10 10">
        <path class="c-hw-cable" d="M -120 ${USB.mega.y} H -30" />
        <rect class="c-hw-boot" x="-34" y="${USB.mega.y - 13}" width="22" height="26" rx="4" />
        <rect class="c-hw-head" x="-14" y="${USB.mega.y - 10}" width="16" height="20" rx="2" />
      </svg>`,
    bounds: [-124, USB.mega.y - 14, 2, USB.mega.y + 14],
  },
  run(t, view) {
    view.q<SVGElement>('.c-hw-plug').style.transform = `translateX(${-plugOffset(t)}px)`;
    const powered = t >= PLUG_IN[1] && t < PLUG_OUT[1] - 200;
    view.part<Mega>('arduino-mega').ledPower = powered;
    view.part<Lcd>('LCD1').text = powered && t >= PRINTED ? HELLO : BLANK;
  },
  activity: [{ wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: [PRINTED - 40] }],
};

export default lcdHelloWorld;
