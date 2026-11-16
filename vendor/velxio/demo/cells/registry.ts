// Every cell under ./tasks/<board>/<task>.ts. A new file shows up with no registration.

import type { Cell } from './cell';

const modules = import.meta.glob<{ default: Cell }>('./tasks/*/*.ts');

const byKey = new Map(Object.entries(modules).map(([file, load]) => [file.slice('./tasks/'.length, -'.ts'.length), load]));

export function hasCell(board: string, task: string): boolean {
  return byKey.has(`${board}/${task}`);
}

export async function loadCell(board: string, task: string): Promise<Cell> {
  const load = byKey.get(`${board}/${task}`);
  if (!load) throw new Error(`no ${board} cell for task '${task}'`);
  return (await load()).default;
}
