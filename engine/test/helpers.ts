import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const CONTRACTS = join(here, '..', '..', 'contracts');

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function readDirJson<T = unknown>(dir: string): { file: string; data: T }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({ file, data: readJson<T>(join(dir, file)) }));
}

/** Relative closeness for engine numbers (exact arithmetic, float noise only). */
export function close(actual: number | undefined, expected: number, tol = 1e-9): boolean {
  if (actual === undefined) return false;
  return Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected));
}
