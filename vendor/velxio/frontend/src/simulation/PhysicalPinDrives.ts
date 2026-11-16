export interface PinDrive {
  voltage: number;
  resistance: number;
}

export function validatePinDrive(drive: PinDrive): void {
  if (!Number.isFinite(drive.voltage) || !Number.isFinite(drive.resistance) || drive.resistance <= 0) {
    throw new Error('physical pin drive requires a finite voltage and positive resistance');
  }
}

export function resolvePinVoltage(drives: Iterable<PinDrive | null>): number | null {
  let current = 0;
  let conductance = 0;
  for (const drive of drives) {
    if (drive === null) continue;
    validatePinDrive(drive);
    current += drive.voltage / drive.resistance;
    conductance += 1 / drive.resistance;
  }
  return conductance === 0 ? null : current / conductance;
}

export function equivalentPinDrive(drives: Iterable<PinDrive | null>): PinDrive | null {
  const sources = [...drives];
  const voltage = resolvePinVoltage(sources);
  if (voltage === null) return null;
  const conductance = sources.reduce((sum, drive) => sum + (drive === null ? 0 : 1 / drive.resistance), 0);
  return { voltage, resistance: 1 / conductance };
}

const contributors = new Map<string, Map<string, PinDrive | null>>();

export function setPhysicalPinDrive(component: string, pin: string, owner: string, drive: PinDrive | null): boolean {
  if (drive !== null) validatePinDrive(drive);
  const key = `${component}:${pin}`;
  let sources = contributors.get(key);
  if (!sources) { sources = new Map(); contributors.set(key, sources); }
  const previous = sources.get(owner);
  if (sources.has(owner) && (previous === drive || (previous !== null && drive !== null &&
      previous?.voltage === drive.voltage && previous?.resistance === drive.resistance))) return false;
  sources.set(owner, drive);
  return true;
}

export function getPhysicalPinDrives(component: string): Array<{ pin: string; owner: string; drive: PinDrive | null }> {
  const result: Array<{ pin: string; owner: string; drive: PinDrive | null }> = [];
  for (const [key, sources] of contributors) {
    if (!key.startsWith(`${component}:`)) continue;
    for (const [owner, drive] of sources) result.push({ pin: key.slice(component.length + 1), owner, drive });
  }
  return result;
}

export function clearPhysicalPinDrives(component: string): void {
  for (const key of contributors.keys()) if (key.startsWith(`${component}:`)) contributors.delete(key);
}
