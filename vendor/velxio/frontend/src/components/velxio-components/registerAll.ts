/**
 * registerAll.ts — side-effect import that defines every Velxio custom element.
 *
 * This is the single canonical list. Import it from any entry point that
 * renders the canvas (`main.tsx`, the testbench harness) rather than repeating
 * the imports there: a tagName missing from an entry point still resolves in
 * metadata, so the component renders as an inert unknown element — pins, label
 * and part simulation all keep working while the body is invisible, which is a
 * hard failure mode to spot.
 */

import './IC74HC595';
import './LogicGateElements';
import './TransistorElements';
import './OpAmpElements';
import './PowerElements';
import './DiodeElements';
import './RelayElements';
import './LogicICElements';
import './MotorDriverElements';
import './FlipFlopElements';
import './RaspberryPi3Element';
import './Bmp280Element';
import './Tmp36Element';
import './Dht11Element';
import './Ky020TiltSwitchElement';
import './Ky018PhotoresistorElement';
import './RelayModuleElement';
import './Ky038SoundSensorElement';
import './Mq2Element';
import './Sen0244Element';
import './Bme280Element';
import './Ds18b20Element';
import './Ky008LaserElement';
import './ActiveBuzzerElement';
import './ShockSensorElement';
import './BounceButtonElement';
import './WaterLevelSensorElement';
import './JoystickElement';
import './EPaperElement';
import './Ssd1306I2cElement';
import './Pa1616sElement';
import './Vl53l0xElement';
import './Pmsa003iElement';
import './Ltr390Element';
import './Sgp40Element';
import './Max32664Element';
import './WifiElement';
import './BleElement';
import './Hmc5883lElement';
import './Mlx90614Element';
import './Drv2605lElement';
import './Max17048Element';
import './Amg8833Element';
import './Mpr121Element';
import './L298nElement';
import './LineSensorElement';
import './LevelShifterElement';

import './Hm10Element';
