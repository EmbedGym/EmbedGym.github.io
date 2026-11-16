import type { Cell } from '../../cell';
import { runServer, server, setServerLink, type ServerMessage } from '../../decor/server';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

type Led = HTMLElement & { value: boolean };

// The board reads the BME280 every 2 s and publishes it to home/room1/env on mqtt.iot.test; it
// subscribes to home/room1/led and switches the LED on GPIO10 on "on" and off on "off". Over the
// loop the broker sends "on", then "off". Joining WiFi and the broker happens once at boot, so the
// loop starts already linked.
const DURATION = 6000;
const PUBLISH = [400, 2400, 4400];
const LED_ON = 2000;
const LED_OFF = 4000;
// One chip takes 600 ms to cross the lane.
const FLIGHT = 600;

// A zero-width space after each comma lets a reading wrap at its fields without changing its text.
const ENV = 'ENV {"temp_c":23.5,​"hum_pct":41.4,​"press_hpa":1002.3}';
const LOOP_PRINTS: Print[] = [
  ...PUBLISH.map((t) => ({ t, text: ENV })),
  { t: LED_ON, text: 'LED on' },
  { t: LED_OFF, text: 'LED off' },
].sort((a, b) => a.t - b.t);
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const MQTT: ServerMessage[] = [
  ...PUBLISH.map((t) => ({ t: t + FLIGHT, text: 'PUB env', dir: 'to' as const })),
  { t: LED_ON - FLIGHT, text: 'led: on', dir: 'from' },
  { t: LED_OFF - FLIGHT, text: 'led: off', dir: 'from' },
];

// The card is tall (the console socket is at the board's foot), so the text is larger.
const FONT = 44;
// Under the board; a reading wraps onto two rows at its commas, and an LED line takes a third:
// 34 + 3 x 59.8 + 10.
const SERIAL = { x: -125, y: 372, w: 980, h: 224 };
// The lane runs from the broker to the WiFi access point (W1, right edge at 358).
const REACH = 240;
const BROKER = { x: 372 + REACH, y: 102 };

const mqttEnvNodeEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, wrap: true, fontSize: FONT })}
      ${server('mqtt', { ...BROKER, kind: 'broker', label: 'MQTT broker', fontSize: FONT, side: 'left', reach: REACH })}`,
    bounds: [SERIAL.x, -6, BROKER.x + 290, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: ['w-38-SDA', 'w-39-SCL'], at: PUBLISH.map((t) => t - 20) }],
  run(t, view) {
    setServerLink(view, 'mqtt', true);
    runServer(view, 'mqtt', t, MQTT);
    const lit = t >= LED_ON && t < LED_OFF;
    view.part<Led>('L1').value = lit;
    ['w-10-R1', 'w-R1-L1'].forEach((id) => view.glowWire(id, lit ? 1 : 0));
    showSerial(view, 'out', t, PRINTS);
  },
};

export default mqttEnvNodeEsp32s3;
