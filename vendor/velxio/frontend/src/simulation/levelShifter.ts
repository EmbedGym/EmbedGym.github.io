/**
 * The 4-channel BSS138 bidirectional level shifter (SparkFun BOB-12009
 * topology). Per channel n: BSS138 drain = HVn, gate = LV, source = LVn,
 * and a 10 kΩ pull-up on each side (HVn → HV, LVn → LV).
 */
export const LEVEL_SHIFTER_PULLUP_OHMS = 10_000;

/** [HVn, LVn] per channel: the only pin pairs a signal crosses. */
export const LEVEL_SHIFTER_CHANNELS: ReadonlyArray<readonly [string, string]> = [
  ['HV1', 'LV1'],
  ['HV2', 'LV2'],
  ['HV3', 'LV3'],
  ['HV4', 'LV4'],
];
