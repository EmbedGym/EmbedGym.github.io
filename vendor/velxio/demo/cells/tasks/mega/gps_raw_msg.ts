import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { GPS_TOP, gpsSkyHtml, NMEA_BYTE_MS, nmeaBurst, runGpsSky, SKY_LEFT, type GpsBoard } from './gps_fix_status';

// The sketch copies every byte from the GPS to the monitor, so each second's
// whole default burst (GGA, GSA, GSV, RMC, VTG) scrolls past, each line as its
// newline arrives. As in the test, the first burst goes out at 1 s and the fix
// comes at 1.7 s, after which GGA and RMC carry the New York position.
const DURATION = 6000;
const BURSTS = [1000, 2000, 3000, 4000, 5000];
const FIX_AT = 1700;
const FADE_FROM = 5600;

const WINDOWS = BURSTS.map((at) => {
  let start = at;
  return nmeaBurst(at / 1000, at >= FIX_AT).map((sentence) => {
    const end = start + (sentence.length + 2) * NMEA_BYTE_MS;
    const window = { start, end, sentence };
    start = end;
    return window;
  });
});
const PRINTS: Print[] = WINDOWS.flat().map((w) => ({ t: w.end, text: w.sentence }));

/** `serialKey` names the monitor; unique per board, since its style selects by it. */
export function gpsRawCell(b: GpsBoard & { serialKey: string }): Cell {
  return {
    duration: DURATION,
    decor: {
      html: `
        <style>
          /* Lines run past the monitor's edge, as in a monitor without wrapping. */
          [data-serial="${b.serialKey}"] .k-serial-window { mask-image: linear-gradient(to right, #000 80%, transparent 98%); }
        </style>
        ${serialPanel(b.serialKey, b.panel, { note: '115200', cableTo: b.usb, fontSize: b.fontSize })}
        ${gpsSkyHtml({ prefix: b.prefix })}`,
      bounds: b.bounds,
    },
    run(t, view) {
      // The fix holds to the end of the loop and drops as the monitor clears.
      runGpsSky(view, t, DURATION, FIX_AT, FADE_FROM, { homes: b.homes, prefix: b.prefix });
      const burst = [...WINDOWS].reverse().find((w) => w[0].start <= t);
      if (burst && t < burst[burst.length - 1].end && t < FADE_FROM) view.glowWire(b.txWire, 1);
      showSerial(view, b.serialKey, t, PRINTS, { board: b.board, fadeFrom: FADE_FROM });
    },
  };
}

const PANEL = { x: -330, y: -140, w: 300, h: 283 };

export default gpsRawCell({
  board: 'arduino-mega',
  usb: USB.mega,
  txWire: 'w-19-TX',
  prefix: 'c-raw-',
  serialKey: 'raw',
  homes: SKY_LEFT,
  panel: PANEL,
  bounds: [PANEL.x, GPS_TOP, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});
