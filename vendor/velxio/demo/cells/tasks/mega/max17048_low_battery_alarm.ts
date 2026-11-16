import type { Cell } from '../../cell';
import { LIPO, lipo, setLipo } from '../../decor/lipo';
import { setSound, sound } from '../../decor/sound';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// The battery drains past the 15 % threshold and is then put on charge. The
// sketch reads the charge once a second. At or below 15 % it beeps 100 ms at
// 2 kHz on each read and blinks the LED 250 ms on, 250 ms off; above 15 % it
// silences both.
export const DURATION = 7000;
export const READS = [300, 1300, 2300, 3300, 4300, 5300, 6300];
export const SOCS = [16.5, 15.6, 15.0, 14.5, 14.0, 15.4, 16.2];
export const low = (soc: number) => soc <= 15;
export const ALARM_FROM = READS[SOCS.findIndex(low)];
export const ALARM_TO = READS[SOCS.findIndex((soc, i) => i > 0 && low(SOCS[i - 1]) && !low(soc))];
export const BEEPS = READS.filter((_, i) => low(SOCS[i]));

/** Styles the "on" in PRINTS; a cell showing PRINTS includes it. */
export const ON_STYLE = '<style>.c-lba-on { color: var(--warn); }</style>';

const LOOP_PRINTS: Print[] = READS.map((t, i) => ({
  t: t + 25,
  text: low(SOCS[i])
    ? `SOC: ${SOCS[i].toFixed(1)} Alarm: <b class="c-lba-on">on</b>`
    : `SOC: ${SOCS[i].toFixed(1)} Alarm: off`,
}));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -350, y: -54, w: 330, h: 118 };
/** The LiPo's lead tip on the gauge's JST connector. */
const BATTERY = { x: 304.2, y: -183.8 };

const max17048LowBatteryAlarm: Cell = {
  duration: DURATION,
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  decor: {
    html: `
      ${ON_STYLE}
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega })}
      ${lipo('cell', BATTERY)}
      ${sound('beep')}`,
    bounds: [PANEL.x, BATTERY.y - LIPO.h, BATTERY.x - LIPO.leadX + LIPO.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    // Before the first read the gauge still shows the previous loop's last one.
    const read = READS.findLastIndex((r) => r <= t);
    const soc = SOCS[read === -1 ? SOCS.length - 1 : read];
    setLipo(view, 'cell', soc / 100, `${soc.toFixed(1)}%`);

    const alarm = t >= ALARM_FROM && t < ALARM_TO;
    const ledOn = alarm && (t - ALARM_FROM) % 500 < 250;
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn;
    if (ledOn) {
      view.glowWire('w-4-resistor', 1);
      view.glowWire('w-resistor-LED', 1);
    }

    const beeping = BEEPS.some((b) => t >= b && t < b + 100);
    if (beeping) view.glowWire('w-3-BZ1', 1);
    // Three sound rings spread left from the buzzer on each beep, 8 px clear of the buzzer and the ground trunk.
    const buz = view.box('BZ1');
    const lastBeep = BEEPS.findLast((b) => b <= t);
    const waves = lastBeep === undefined ? null : (t - lastBeep) / 90;
    setSound(view, 'beep', { x: buz.x + buz.w / 2, y: buz.y + 38 }, waves, { dir: 'left', from: 56, to: 71, count: 3 });

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default max17048LowBatteryAlarm;
