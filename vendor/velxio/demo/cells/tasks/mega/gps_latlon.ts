import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { GPS_TOP, gpsSkyHtml, heardFix, NMEA_BURSTS, runGpsSky, SKY_LEFT, type GpsBoard } from './gps_fix_status';

// The module gets a fix over New York (the test's 40.7128, -74.006), holds it,
// then loses it; once a second the sketch prints the position in signed decimal
// degrees with four places, or "fix invalid" without a fix.
const DURATION = 6000;
const FIX_AT = 1500;
const LOST_AT = 3500;

/**
 * `lagged` prints what the board last heard in a burst (see heardFix); without
 * it the print follows the module's state at once.
 */
export function gpsLatlonCell(b: GpsBoard & { chip: { x: number; y: number }; wrap: boolean; lagged?: boolean }): Cell {
  const fixed = (t: number) => (b.lagged ? heardFix(t, FIX_AT, LOST_AT) : t >= FIX_AT && t < LOST_AT);
  const lineAt = (t: number) =>
    fixed(t)
      ? `Latitude: <b class="${b.prefix}num">40.7128</b> Longitude: <b class="${b.prefix}num">-74.0060</b>`
      : `<span class="${b.prefix}invalid">fix invalid</span>`;
  const loopPrints: Print[] = [0, 1000, 2000, 3000, 4000, 5000].map((t) => ({ t: t + 4, text: lineAt(t + 4) }));
  // The previous loop's lines are already on screen at t=0, matching the end state.
  const prints: Print[] = [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
  return {
    duration: DURATION,
    activity: [{ wires: [b.txWire], at: NMEA_BURSTS }],
    decor: {
      html: `
        <style>.${b.prefix}num { color: #0066ff; font-weight: 700; }</style>
        ${serialPanel('out', b.panel, { note: '115200', cableTo: b.usb, wrap: b.wrap, fontSize: b.fontSize })}
        ${gpsSkyHtml({ chip: b.chip, chipFont: b.chipFont, prefix: b.prefix })}`,
      bounds: b.bounds,
    },
    run(t, view) {
      runGpsSky(view, t, DURATION, FIX_AT, LOST_AT, { homes: b.homes, prefix: b.prefix });
      showSerial(view, 'out', t, prints, { board: b.board });
    },
  };
}

const PANEL = { x: -330, y: -64, w: 300, h: 181 };

export default gpsLatlonCell({
  board: 'arduino-mega',
  usb: USB.mega,
  txWire: 'w-19-TX',
  prefix: 'c-gll-',
  homes: SKY_LEFT,
  panel: PANEL,
  wrap: true,
  chip: { x: PANEL.x, y: PANEL.y - 46 },
  lagged: true,
  bounds: [PANEL.x, GPS_TOP, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});
