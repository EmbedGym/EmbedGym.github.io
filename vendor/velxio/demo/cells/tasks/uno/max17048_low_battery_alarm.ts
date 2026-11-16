import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { setSound, sound } from '../../decor/sound';
import { USB, serialPanel, showSerial } from '../../kit';
import { ALARM_FROM, ALARM_TO, BEEPS, DURATION, ON_STYLE, PRINTS, READS, SOCS } from '../mega/max17048_low_battery_alarm';
import { UNO_LIPO } from './max17048_read_cell_voltage';

const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-SDA', 'w-SCL'];
const BUZZER_WIRE = 'w-3-BZ1';
const LED_WIRES = ['w-4-resistor', 'w-resistor-LED'];

const PANEL = { x: -362, y: 0, w: 342, h: 120 };
// The frame scales to about 0.72, so the pouch grows to keep its label 18 px or more.
const LIPO_SCALE = 1.1;
const POUCH = { x: UNO_LIPO.x - LIPO.leadX * LIPO_SCALE, y: UNO_LIPO.y - LIPO.h * LIPO_SCALE };
/** BZ1's element box; the rings spread right of it, clear of the LED on its left. */
const BUZZER = { x: 227.5, y: -107.6, w: 75, h: 83.6 };
const RINGS_TO = 71;

const max17048LowBatteryAlarmUno: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: READS }],
  decor: {
    html: `
      ${ON_STYLE}
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, fontSize: 26 })}
      ${lipo('cell', { ...UNO_LIPO, scale: LIPO_SCALE })}
      ${sound('beep')}`,
    bounds: [PANEL.x, BUZZER.y, POUCH.x + LIPO.w * LIPO_SCALE, PANEL.y + PANEL.h],
  },
  run(t, view) {
    // Before the first read the gauge still shows the previous loop's last one.
    const read = READS.findLastIndex((r) => r <= t);
    const soc = SOCS[read === -1 ? SOCS.length - 1 : read];
    setLipo(view, 'cell', soc / 100, `${soc.toFixed(1)}%`);

    const alarm = t >= ALARM_FROM && t < ALARM_TO;
    const ledOn = alarm && (t - ALARM_FROM) % 500 < 250;
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn;
    if (ledOn) for (const id of LED_WIRES) view.glowWire(id, 1);

    const beeping = BEEPS.some((b) => t >= b && t < b + 100);
    if (beeping) view.glowWire(BUZZER_WIRE, 1);
    const buz = view.box('BZ1');
    const lastBeep = BEEPS.findLast((b) => b <= t);
    const waves = lastBeep === undefined ? null : (t - lastBeep) / 90;
    setSound(view, 'beep', { x: buz.x + buz.w / 2, y: buz.y + 38 }, waves, { dir: 'right', from: 56, to: RINGS_TO, count: 3 });

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default max17048LowBatteryAlarmUno;
