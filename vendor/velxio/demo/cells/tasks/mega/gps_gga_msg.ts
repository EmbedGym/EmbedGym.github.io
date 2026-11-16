import type { Cell, Rect } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { GPS_TOP, gpsSkyHtml, NMEA_BYTE_MS, nmeaBurst, runGpsSky, SKY_LEFT, type GpsBoard } from './gps_fix_status';

// Each second the module sends GGA, GSA, GSV, RMC and VTG; the sketch forwards
// only the $GPGGA line, as soon as its newline arrives, and drops the rest.
// The module gets a fix mid-loop, so the GGA lines gain the test's New York position.
const DURATION = 6000;
// As in the test: the module's first burst goes out at 1 s, the fix comes at 2.7 s.
const BURSTS = [1000, 2000, 3000, 4000, 5000];
const FIX_AT = 2700;
const FADE_FROM = 5600;
const KINDS = ['GGA', 'GSA', 'GSV', 'RMC', 'VTG'];

// When each sentence of each burst is on the wire: [start, end) in ms.
const WINDOWS = BURSTS.map((at) => {
  let start = at;
  return nmeaBurst(at / 1000, at >= FIX_AT).map((sentence) => {
    const end = start + (sentence.length + 2) * NMEA_BYTE_MS;
    const window = { start, end, sentence };
    start = end;
    return window;
  });
});
const PRINTS: Print[] = WINDOWS.map((burst) => ({
  t: burst[0].end,
  // A line may break after any comma, as a narrow monitor would wrap it.
  text: burst[0].sentence.replaceAll(',', ',<wbr>'),
}));
/**
 * `stream` is the top-left of the box listing each burst's sentences, drawn
 * `streamScale` times its natural size: 236 x 118, or 336 x 84 with the tags
 * in one row (`streamRow`).
 */
export function gpsGgaCell(
  b: GpsBoard & { stream: { x: number; y: number }; streamScale?: number; streamRow?: boolean },
): Cell {
  const p = b.prefix;
  const k = b.streamScale ?? 1;
  const size = b.streamRow ? { w: 336, h: 84 } : { w: 236, h: 118 };
  return {
    duration: DURATION,
    decor: {
      html: `
        <style>
          .${p}stream {
            position: absolute; width: ${size.w}px; height: ${size.h}px; transform-origin: 0 0;
            box-sizing: border-box; padding: 6px 12px; border-radius: 12px; background: #f8fafc; border: 1.5px solid #cfd6df;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
          }
          .${p}head { font: 600 24px/32px var(--sans); color: var(--muted); }
          .${p}tags { display: flex; flex-wrap: ${b.streamRow ? 'nowrap' : 'wrap'}; gap: 6px 8px; margin-top: 4px; }
          .${p}tag {
            width: ${b.streamRow ? 56 : 62}px; text-align: center; border-radius: 8px; border: 2px solid #cfd6df; background: #fff;
            font: 700 24px/30px var(--mono); color: var(--ink);
          }
          .${p}tag.sending { border-color: var(--accent); background: #e3edfc; color: var(--accent); }
          .${p}tag.kept { border-color: #00aa00; background: #e6f6e6; color: #00870a; }
          .${p}tag.dropped { color: #a9b1bb; text-decoration: line-through; }
        </style>
        ${serialPanel('out', b.panel, { note: '115200', cableTo: b.usb, wrap: true, fontSize: b.fontSize })}
        <div class="${p}stream" style="left:${b.stream.x}px;top:${b.stream.y}px;transform:scale(${k})">
          <div class="${p}head">GPS, each second</div>
          <div class="${p}tags">${KINDS.map((kind) => `<div class="${p}tag">${kind}</div>`).join('')}</div>
        </div>
        ${gpsSkyHtml({ sats: false, prefix: p })}`,
      bounds: b.bounds,
    },
    run(t, view) {
      // The fix holds to the end of the loop and drops as the monitor clears.
      runGpsSky(view, t, DURATION, FIX_AT, FADE_FROM, { homes: b.homes, prefix: p });
      const burst = [...WINDOWS].reverse().find((w) => w[0].start <= t);
      view.qa<HTMLElement>(`.${p}tag`).forEach((tag, i) => {
        const w = burst && t < FADE_FROM ? burst[i] : undefined;
        tag.className = `${p}tag`;
        if (!w || t < w.start) return;
        if (t < w.end) tag.classList.add('sending');
        else tag.classList.add(i === 0 ? 'kept' : 'dropped');
      });
      if (burst && t < burst[burst.length - 1].end && t < FADE_FROM) view.glowWire(b.txWire, 1);
      showSerial(view, 'out', t, PRINTS, { board: b.board, fadeFrom: FADE_FROM });
    },
  };
}

const PANEL: Rect = { x: -330, y: -140, w: 300, h: 283 };

export default gpsGgaCell({
  board: 'arduino-mega',
  usb: USB.mega,
  txWire: 'w-19-TX',
  prefix: 'c-gga-',
  homes: SKY_LEFT,
  panel: PANEL,
  stream: { x: 24, y: -142 },
  bounds: [PANEL.x, GPS_TOP, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});
