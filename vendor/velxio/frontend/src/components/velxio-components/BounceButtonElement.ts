/**
 * BounceButtonElement.ts — 12 mm tactile pushbutton whose contacts bounce
 *
 * Same footprint, legs and interaction as `wokwi-pushbutton`: legs 1.l / 1.r
 * are one terminal and 2.l / 2.r the other; pressing bridges the two. The
 * contact bounce itself is electrical and lives in the part simulation
 * (parts/local/BounceButton.ts); this element only reports the actuator.
 *
 * Artwork: a real 12 × 12 mm tactile switch seen from above — black base,
 * steel cover plate with the four corner posts, tinned legs, and a yellow
 * round cap that darkens and sinks while pressed.
 *
 * Geometry (viewBox mm, drawn at 17.802 × 12 mm like wokwi-pushbutton):
 *   Body: 12 × 12 mm square at x 0..12; legs stick out 3 mm left and right.
 *   Pin tips (CSS px): left legs at x 0, right legs at x 67, rows y 13 / 32.
 */

const BASE = '#29292b';
const PLATE = '#c5c9ce';
const PLATE_EDGE = '#8d939a';
const LEG = '#aeb2b6';
const CAP_RIM = '#8a6400';
const CAP_UP = { skirt: '#e8a900', top: '#ffc61a', topR: 3.45 };
const CAP_DOWN = { skirt: '#b98600', top: '#cf9a00', topR: 3.15 };

const PIN_INFO = [
  { name: '1.l', x: 0, y: 13, number: 1, signals: [] as Array<unknown> },
  { name: '2.l', x: 0, y: 32, number: 2, signals: [] as Array<unknown> },
  { name: '1.r', x: 67, y: 13, number: 3, signals: [] as Array<unknown> },
  { name: '2.r', x: 67, y: 32, number: 4, signals: [] as Array<unknown> },
];

class BounceButtonElement extends HTMLElement {
  readonly pinInfo = PIN_INFO;

  private _pressed = false;

  get pressed() {
    return this._pressed;
  }

  // The canvas syncs the stored `pressed` property back onto the element; like
  // wokwi-pushbutton's, setting it redraws without firing press events.
  set pressed(value: boolean) {
    const next = value === true || (value as unknown) === 'true';
    if (next === this._pressed) return;
    this._pressed = next;
    if (this.isConnected) this.render();
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.addEventListener('mousedown', this.down);
    this.addEventListener('mouseup', this.up);
    this.addEventListener('mouseleave', this.up);
    this.addEventListener('touchstart', this.down);
    this.addEventListener('touchend', this.up);
  }

  disconnectedCallback() {
    this.removeEventListener('mousedown', this.down);
    this.removeEventListener('mouseup', this.up);
    this.removeEventListener('mouseleave', this.up);
    this.removeEventListener('touchstart', this.down);
    this.removeEventListener('touchend', this.up);
  }

  readonly down = () => {
    if (this._pressed) return;
    this._pressed = true;
    this.render();
    this.dispatchEvent(new Event('button-press'));
  };

  readonly up = () => {
    if (!this._pressed) return;
    this._pressed = false;
    this.render();
    this.dispatchEvent(new Event('button-release'));
  };

  private render() {
    // Leg centred on row y: a wide shoulder at the body edge, then the lead.
    const leftLeg = (y: number) =>
      `<rect x="-0.5" y="${y - 0.95}" width="0.5" height="1.9"/>
       <rect x="-3" y="${y - 0.5}" width="2.6" height="1" rx="0.2"/>`;
    const rightLeg = (y: number) =>
      `<rect x="12" y="${y - 0.95}" width="0.5" height="1.9"/>
       <rect x="12.4" y="${y - 0.5}" width="2.6" height="1" rx="0.2"/>`;
    const cap = this._pressed ? CAP_DOWN : CAP_UP;
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; cursor: pointer; }
        svg   { display: block; overflow: visible; }
      </style>
      <svg width="17.802mm" height="12mm" viewBox="-3 0 18 12" xmlns="http://www.w3.org/2000/svg">
        <g fill="${LEG}">${leftLeg(3.39)}${leftLeg(8.45)}${rightLeg(3.39)}${rightLeg(8.45)}</g>
        <rect x="0" y="0" width="12" height="12" rx="0.5" fill="${BASE}"/>
        <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.3" fill="${PLATE}"
              stroke="${PLATE_EDGE}" stroke-width="0.1"/>
        <g fill="${BASE}">
          <circle cx="1.95" cy="1.95" r="0.72"/><circle cx="10.05" cy="1.95" r="0.72"/>
          <circle cx="10.05" cy="10.05" r="0.72"/><circle cx="1.95" cy="10.05" r="0.72"/>
        </g>
        <circle cx="6" cy="6" r="4.3" fill="${cap.skirt}" stroke="${CAP_RIM}" stroke-width="0.14"/>
        <circle cx="6" cy="6" r="${cap.topR}" fill="${cap.top}" stroke="${CAP_RIM}"
                stroke-opacity="0.45" stroke-width="0.08"/>
      </svg>`;
  }
}

if (!customElements.get('velxio-bounce-button')) {
  customElements.define('velxio-bounce-button', BounceButtonElement);
}

export { BounceButtonElement };
