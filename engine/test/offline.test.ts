import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTRACTS, readDirJson } from './helpers';
import { planFarm, simulate, createFao56DeficitSource, saxtonRawls, type FarmInput } from '../src/index';

// The core path must never touch the network (idea doc, build addendum: "Offline and data").
describe('offline guarantee', () => {
  const calls: string[] = [];
  const g = globalThis as Record<string, unknown>;
  const saved: Record<string, unknown> = {};
  beforeEach(() => {
    for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
      saved[k] = g[k];
      g[k] = vi.fn(() => {
        calls.push(k);
        throw new Error(`network access attempted via ${k}`);
      });
    }
  });
  afterEach(() => {
    for (const k of Object.keys(saved)) g[k] = saved[k];
  });

  it('plans every golden fixture, runs the FAO-56 source and the simulator with the network stubbed out', () => {
    const source = createFao56DeficitSource({ lat_deg: -2.8, tmax_c: Array(12).fill(29), tmin_c: Array(12).fill(9) });
    for (const { data } of readDirJson<{ input: FarmInput }>(join(CONTRACTS, 'fixtures', 'golden'))) {
      planFarm(data.input);
      planFarm(data.input, { deficitSource: source });
    }
    simulate({ days: 30, taw_mm: 75, raw_mm: 30, area_m2: 1000, efficiency: 0.6, etc_mm_per_day: () => 5.75, rain_mm: () => 0, initial_deficit_mm: 0, strategy: { kind: 'coach' } });
    saxtonRawls({ sand_pct: 60, clay_pct: 20, om_pct: 2 });
    expect(calls).toEqual([]);
  });

  it('engine source contains no network APIs or imports', () => {
    const src = join(import.meta.dirname, '..', 'src');
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.ts')) files.push(p);
      }
    };
    walk(src);
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      expect(text, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|https?:\/\/|from ['"]node:/);
    }
  });
});
