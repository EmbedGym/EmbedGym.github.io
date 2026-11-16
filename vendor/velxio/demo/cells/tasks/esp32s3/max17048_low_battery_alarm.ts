import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { setSound, sound } from '../../decor/sound';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { ON_STYLE } from '../mega/max17048_low_battery_alarm';
import { ESP_GAUGE, ESP_LIPO } from './max17048_read_cell_voltage';

const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];
const BUZZER_WIRE = 'w-11-BZ1';
const LED_WIRES = ['w-10-R_LED', 'w-R_LED-L1'];

// The test's three charges: 42.5 % (alarm off), exactly 15.0 % (on: the check is "at or below"), 16.5 % (off
// again), two reads each. app_main reads at once and then every second.
export const ALARM_SOCS = [42.5, 42.5, 15.0, 15.0, 16.5, 16.5];
export const DURATION = 6000;
const low = (soc: number) => soc <= 15;
/** The battery changes 400 ms before the read that reports it. */
const LEAD = 400;
export const ALARM_READS = ALARM_SOCS.map((_, i) => i * 1000);

/**
 * The firmware's state at `t`: the charge the battery holds, and, from the last read, whether the LED is lit and
 * how many ring waves the beep has sent (null when silent). Each second is four 250 ms phases, the first starting
 * at the read; while the last read was low the LED is on in phases 0 and 2 and the buzzer sounds for the first
 * 100 ms. The nRF card shares it.
 */
export function alarmAt(t: number) {
  const soc = ALARM_SOCS[Math.floor(((t + LEAD) % DURATION) / 1000)];
  const alarm = low(ALARM_SOCS[Math.floor(t / 1000)]);
  const phase = t % 1000;
  return {
    soc,
    ledOn: alarm && (phase < 250 || (phase >= 500 && phase < 750)),
    beeping: alarm && phase < 100,
    waves: alarm ? phase / 90 : null,
  };
}

const LOOP_PRINTS: Print[] = ALARM_READS.map((t, i) => ({
  t: t + 20,
  text: low(ALARM_SOCS[i])
    ? `SOC: ${ALARM_SOCS[i].toFixed(1)} Alarm: <b class="c-lba-on">on</b>`
    : `SOC: ${ALARM_SOCS[i].toFixed(1)} Alarm: off`,
}));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

// The frame scales to about 0.48: text is sized to stay 18 px or more on screen.
const LIPO_SCALE = 1.6;
// Under the UART socket, below the board and the LiPo.
const PANEL = { x: -20, y: 366, w: 500, h: 152 };
/** BZ1's element box, left of the board; its rings rise above it. */
const BUZZER = { x: -137, y: 52, w: 75, h: 83.6 };
const RINGS = { from: 56, to: 71 };

const max17048LowBatteryAlarmEsp: Cell = {
  duration: DURATION,
  activity: [{ wires: I2C_WIRES, at: ALARM_READS }],
  decor: {
    html: `
      ${ON_STYLE}
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 38 })}
      ${lipo('cell', { ...ESP_LIPO, lead: 'up', scale: LIPO_SCALE })}
      ${sound('beep')}`,
    bounds: [BUZZER.x, ESP_GAUGE.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const { soc, ledOn, beeping, waves } = alarmAt(t);
    setLipo(view, 'cell', soc / 100, `${soc.toFixed(1)}%`);

    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn;
    if (ledOn) for (const id of LED_WIRES) view.glowWire(id, 1);

    if (beeping) view.glowWire(BUZZER_WIRE, 1);
    const buz = view.box('BZ1');
    setSound(view, 'beep', { x: buz.x + buz.w / 2, y: buz.y + 38 }, waves, { dir: 'up', ...RINGS, count: 3 });

    showSerial(view, 'out', t, PRINTS);
  },
};

export default max17048LowBatteryAlarmEsp;
