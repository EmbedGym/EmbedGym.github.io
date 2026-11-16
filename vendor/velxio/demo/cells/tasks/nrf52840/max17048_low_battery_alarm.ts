import type { Cell } from '../../cell';
import { lipo, setLipo } from '../../decor/lipo';
import { setSound, sound } from '../../decor/sound';
import { USB, serialPanel, showSerial } from '../../kit';
import { ON_STYLE } from '../mega/max17048_low_battery_alarm';
import { ALARM_READS, DURATION, PRINTS, alarmAt } from '../esp32s3/max17048_low_battery_alarm';

const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const BUZZER_WIRE = 'w-P1.15-BZ1';
const LED_WIRES = ['w-P1.12-R_LED', 'w-R_LED-L1'];

// main polls on the same 250 ms phases as the ESP32-S3 firmware, starting at boot.
/** GAUGE1's element box: turned 270° above the LED, so its JST connectors open left. */
const GAUGE = { x: -96.8, y: -213.2 };
/** The left JST connector's tip, where the LiPo's lead ends. */
const LIPO_TIP = { x: GAUGE.x + 16, y: GAUGE.y + 67 };
// The frame scales to about 0.55: text is sized to stay 18 px or more on screen.
const LIPO_SCALE = 1.4;
const PANEL = { x: -480, y: 30, w: 453, h: 140 };
// The rings spread right of the buzzer, short of the resistor.
const RINGS = { from: 50, to: 62 };

const max17048LowBatteryAlarmNrf: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: ALARM_READS }],
  decor: {
    html: `
      ${ON_STYLE}
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: 33 })}
      ${lipo('cell', { ...LIPO_TIP, lead: 'right', scale: LIPO_SCALE })}
      ${sound('beep')}`,
    bounds: [PANEL.x, GAUGE.y, GAUGE.x, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const { soc, ledOn, beeping, waves } = alarmAt(t);
    setLipo(view, 'cell', soc / 100, `${soc.toFixed(1)}%`);

    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn;
    if (ledOn) for (const id of LED_WIRES) view.glowWire(id, 1);

    if (beeping) view.glowWire(BUZZER_WIRE, 1);
    const buz = view.box('BZ1');
    setSound(view, 'beep', { x: buz.x + buz.w / 2, y: buz.y + 38 }, waves, { dir: 'right', ...RINGS, count: 3 });

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default max17048LowBatteryAlarmNrf;
