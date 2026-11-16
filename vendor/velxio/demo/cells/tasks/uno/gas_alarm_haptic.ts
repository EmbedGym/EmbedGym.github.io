import { clamp } from '../../anim';
import type { Cell, Rect } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { puffs, runPuffs } from '../../decor/puffs';
import { setVibration, vibration } from '../../decor/vibration';
import {
  BASELINE,
  BUZZES,
  BUZZ_MS,
  DO_HIGH,
  DO_LOW,
  DURATION,
  EVENTS,
  FADE_FROM,
  POT,
  POT_MS,
  PUFFS,
  READS,
  SAMPLING,
  SETUP_END,
  WARMUP,
  alarmAt,
  doLowAt,
  doTripAt,
  gasAt,
  levelAt,
} from '../mega/gas_alarm_haptic';

type Point = { x: number; y: number };
type Haptic = HTMLElement & { vibrating: boolean };

/** One board's version of the Mega card: the same story, read through that board's ADC and drawn around its layout. */
export interface GasAlarmBoard {
  board: string;
  usb: UsbPort;
  /** Class prefix, c-ga<u|e|n>. */
  pre: string;
  /** The board's reading for the Mega's 205 baseline, and the analog pin's name. */
  baseline: number;
  pin: string;
  wires: { ao: string[]; do: string[]; led: string[]; i2c: string[] };
  /** The DO wire's colour, which the panel's DO marker and the pot knob share. */
  doColour: string;
  /** Bus traffic besides the buzzes (the nRF stops the effect at ALARM END). */
  i2cAt: number[];
  serial: Rect & { font: number };
  /** The panel and the pot knob are drawn `zoom` times their size, to stay legible on a small card. */
  panel: { x: number; y: number; w: number; zoom: number };
  /** Where gas starts, where it lands (the sensing dome) and the pot knob's top-left, from GAS1's box. */
  gas: (box: Rect) => { from: Point; dome: Point; knob: Point; top: number };
  /** The motor disc's centre, from HAP1's box, and how far the arcs turn to sit either side of it. */
  motor: (box: Rect) => Point;
  motorTurn: number;
  bounds: [number, number, number, number];
}

// The reading before any gas.
const CLEAR = levelAt(0);
const PANEL_H = 156;
const BAR = { x: 18, y: 88, h: 26, max: 520 };
const KNOB = { w: 72, h: 76 };

/**
 * The sketch prints "Warming up", samples the baseline silently, then reports
 * once a second; the Mega's extra setup lines are not in it.
 */
export function gasAlarmCell(o: GasAlarmBoard): Cell {
  const k = o.baseline / BASELINE;
  const rawAt = (t: number) => Math.round(levelAt(t) * k);
  const barW = o.panel.w - 2 * BAR.x;
  const barX = (raw: number) => BAR.x + (barW * Math.min(raw, BAR.max * k)) / (BAR.max * k);
  const prints: Print[] = [
    { t: WARMUP, text: 'Warming up' },
    ...READS.map((r) => ({
      t: r,
      text: `Raw: ${rawAt(r)} Baseline: ${o.baseline} State: ${alarmAt(r) ? 'ALARM' : 'clear'}`,
    })),
    ...EVENTS.map((e) => ({ t: e.t + 1, text: e.text })),
  ].sort((a, b) => a.t - b.t);
  const { pre } = o;

  return {
    duration: DURATION,
    decor: {
      html: `
        ${serialPanel('out', o.serial, { note: '115200', cableTo: o.usb, wrap: true, fontSize: o.serial.font })}
        <div style="position:absolute;left:${o.panel.x}px;top:${o.panel.y}px;width:${o.panel.w}px;height:${PANEL_H}px;transform:scale(${o.panel.zoom});transform-origin:0 0;background:#f8fafc;border:1.5px solid #cfd6df;border-radius:12px;box-shadow:0 2px 6px rgba(15,23,42,0.08);font-family:var(--sans)">
          <div class="${pre}-title" style="position:absolute;left:18px;top:8px;font-size:31px;font-weight:700;color:var(--ink);white-space:nowrap"></div>
          <div class="${pre}-val" style="position:absolute;right:18px;top:6px;font:700 34px var(--mono)"></div>
          <svg width="${o.panel.w}" height="${PANEL_H}" overflow="visible" style="position:absolute;left:0;top:0">
            <rect x="${BAR.x}" y="${BAR.y}" width="${barW}" height="${BAR.h}" rx="6" fill="#e3e8ee" />
            <rect class="${pre}-fill" x="${BAR.x}" y="${BAR.y}" height="${BAR.h}" rx="6" />
            <g class="${pre}-twice">
              <line x1="${barX(2 * o.baseline)}" x2="${barX(2 * o.baseline)}" y1="${BAR.y - 6}" y2="${BAR.y + BAR.h + 6}" stroke="var(--ink)" stroke-width="3" stroke-dasharray="4 3" />
              <text x="${barX(2 * o.baseline)}" y="${BAR.y + BAR.h + 34}" text-anchor="middle" style="font:700 31px var(--mono);fill:var(--ink)">2×${o.baseline}</text>
            </g>
            <g class="${pre}-do">
              <line y1="${BAR.y - 6}" y2="${BAR.y + BAR.h + 6}" stroke="${o.doColour}" stroke-width="4" />
              <text y="${BAR.y - 10}" text-anchor="middle" style="font:700 31px var(--sans);fill:${o.doColour}"></text>
            </g>
          </svg>
        </div>
        ${puffs('big', 16)}${puffs('small', 7)}
        <svg class="${pre}-pot" width="${KNOB.w}" height="${KNOB.h}" overflow="visible" style="position:absolute;transform:scale(${o.panel.zoom});transform-origin:0 0">
          <line class="${pre}-leader" x1="${KNOB.w / 2}" x2="${KNOB.w / 2}" y1="42" stroke="${o.doColour}" stroke-width="3" stroke-dasharray="5 4" />
          <g transform="translate(${KNOB.w / 2} 20)">
            <circle r="18" fill="#1e3a8a" stroke="${o.doColour}" stroke-width="3" />
            <line class="${pre}-knob" y1="-12" y2="12" stroke="#fff" stroke-width="4" stroke-linecap="round" />
          </g>
          <text x="${KNOB.w / 2 + 26}" y="31" style="font:700 31px var(--sans);fill:${o.doColour}">pot</text>
        </svg>
        <div class="${pre}-motor" style="position:absolute;transform:rotate(${o.motorTurn}deg)">${vibration('motor')}</div>`,
      bounds: o.bounds,
    },
    // Each buzz writes GO.
    activity: [{ wires: o.wires.i2c, at: [...BUZZES, ...o.i2cAt].sort((a, b) => a - b) }],
    run(t, view) {
      const raw = rawAt(t);
      const alarm = alarmAt(t);
      const doLow = doLowAt(t);
      // The loop restarts the sketch: the readout crossfades back to the warm-up that t=0 shows.
      const reset = clamp((t - (DURATION - 300)) / 300);
      const restarted = reset >= 0.5;
      const resetOpacity = reset === 0 ? 1 : Math.abs(1 - 2 * reset);
      const title = view.q<HTMLElement>(`.${pre}-title`);
      title.textContent = t < SAMPLING || restarted ? 'warm-up ⏩' : t < SETUP_END ? 'sampling ⏩' : `${o.pin} raw`;
      title.style.opacity = String(resetOpacity);
      view.q<SVGGElement>(`.${pre}-twice`).style.opacity = String(restarted ? 0 : clamp((t - SETUP_END) / 200) * resetOpacity);
      const val = view.q<HTMLElement>(`.${pre}-val`);
      val.textContent = t < SETUP_END || restarted ? '' : String(raw);
      val.style.opacity = String(resetOpacity);
      val.style.color = alarm ? 'var(--warn)' : 'var(--ink)';
      const fill = view.q<SVGRectElement>(`.${pre}-fill`);
      fill.setAttribute('width', String(barX(raw) - BAR.x));
      fill.style.fill = alarm ? 'var(--warn)' : 'var(--accent)';
      const trip = view.q<SVGGElement>(`.${pre}-do`);
      trip.setAttribute('transform', `translate(${barX(doTripAt(t) * k)} 0)`);
      trip.querySelector('text')!.textContent = doLow ? 'DO LOW' : 'DO';

      const gas = o.gas(view.box('GAS1'));
      const turning = POT.some((p) => t > p.at - 150 && t < p.at + POT_MS + 150);
      const pot = view.q<SVGSVGElement>(`.${pre}-pot`);
      pot.style.left = `${gas.knob.x}px`;
      pot.style.top = `${gas.knob.y}px`;
      pot.style.opacity = turning ? '1' : '0';
      pot.querySelector(`.${pre}-leader`)!.setAttribute('y2', String((gas.top - gas.knob.y) / o.panel.zoom - 4));
      // The knob's 270° travel spans DO_LOW..DO_HIGH; turning it down is counter-clockwise.
      pot.querySelector(`.${pre}-knob`)!.setAttribute('transform', `rotate(${(270 * (doTripAt(t) - DO_LOW)) / (DO_HIGH - DO_LOW)})`);
      // Each puff of the story is a stream over its rise..fall, thinner for the smaller one.
      PUFFS.forEach((p, i) =>
        runPuffs(view, i === 0 ? 'big' : 'small', t, {
          from: gas.from,
          to: gas.dome,
          window: [p.rise - 400, p.fall],
          flight: 1200,
          size: [6, 24],
          spread: 30,
          opacity: turning ? 0 : 0.6 * ((p.peak - CLEAR) / (PUFFS[0].peak - CLEAR)) ** 0.5,
          seed: i + 1,
        }),
      );
      for (const id of o.wires.ao) view.glowWire(id, clamp(gasAt(t)));
      if (doLow) for (const id of o.wires.do) view.glowWire(id, 1);

      view.part<HTMLElement & { value: boolean }>('L1').value = alarm;
      if (alarm) for (const id of o.wires.led) view.glowWire(id, 1);

      const lastBuzz = [...BUZZES].reverse().find((b) => b <= t);
      // The arcs linger 300 ms after the 100 ms buzz so it reads at card size.
      const trail = lastBuzz === undefined ? 0 : 1 - clamp((t - lastBuzz - BUZZ_MS) / 300);
      view.part<Haptic>('HAP1').vibrating = BUZZES.some((b) => t >= b && t < b + BUZZ_MS);
      const at = o.motor(view.box('HAP1'));
      const motor = view.q<HTMLElement>(`.${pre}-motor`);
      motor.style.left = `${at.x}px`;
      motor.style.top = `${at.y}px`;
      setVibration(view, 'motor', trail);

      showSerial(view, 'out', t, prints, { board: o.board, fadeFrom: FADE_FROM });
    },
  };
}

// The sketch's own story (same 10-bit ADC and 5 V, so the Mega's readings), with
// the MQ-2 left of the board and the haptic driver under its analog header.
const FONT = 36;
const SERIAL = { x: -570, y: -120, w: 520, h: 34 + 3 * FONT * 1.36 + 10, font: FONT };
const PANEL = { x: -570, y: 100, w: 210, zoom: 1.2 };

export default gasAlarmCell({
  board: 'arduino-uno',
  usb: USB.uno,
  pre: 'c-gau',
  baseline: BASELINE,
  pin: 'A0',
  wires: { ao: ['w-A0-AO'], do: ['w-5-DO'], led: ['w-12-resistor', 'w-resistor-LED'], i2c: ['w-SDA', 'w-SCL'] },
  doColour: '#0000ff',
  i2cAt: [],
  serial: SERIAL,
  panel: PANEL,
  gas: (box) => ({ from: { x: box.x + 60, y: box.y - 64 }, dome: { x: box.x + 40, y: box.y + 34 }, knob: { x: box.x + 20, y: box.y - 84 }, top: box.y }),
  motor: (box) => ({ x: box.x + box.w / 2, y: box.y + box.h - 20 }),
  motorTurn: 0,
  bounds: [SERIAL.x, SERIAL.y, 0, PANEL.y + PANEL_H * PANEL.zoom],
});
