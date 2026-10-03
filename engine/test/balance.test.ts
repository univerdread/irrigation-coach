import { describe, expect, it } from 'vitest';
import { simulate, stepDay, prePurchaseCheck } from '../src/index';

// Worked example: 1,000 m2 tomato, TAW 75 mm, RAW 30 mm, ETc 5.75 mm/day, 20 mm rain on day 12, furrow 60%.
const base = {
  days: 30,
  taw_mm: 75,
  raw_mm: 30,
  area_m2: 1000,
  efficiency: 0.6,
  etc_mm_per_day: () => 5.75,
  rain_mm: (day: number) => (day === 12 ? 20 : 0),
  initial_deficit_mm: 0,
};

describe('FAO-56 root-zone water balance (eqs 84-88)', () => {
  it('coach run matches the worked example: ~225 m3, nothing below the roots', () => {
    const r = simulate({ ...base, strategy: { kind: 'coach' } });
    expect(r.irrigation_days).toEqual([7, 16, 22, 28]);
    expect(r.net_irrigation_mm).toBeCloseTo(135.25, 10);
    expect(r.gross_litres).toBeCloseTo(225_416.666, 2);
    expect(r.deep_percolation_mm).toBe(0);
  });
  it('habit run (10 mm into the soil every day) uses 500 m3 and drains the surplus', () => {
    const r = simulate({ ...base, strategy: { kind: 'fixed_daily', net_mm: 10 } });
    expect(r.gross_litres).toBeCloseTo(500_000, 6);
    expect(r.deep_percolation_mm).toBeCloseTo(30 * 4.25 + 20, 10);
  });
  it('deficit stays within [0, TAW] and water stress slows depletion past RAW', () => {
    const r = simulate({ ...base, days: 60, rain_mm: () => 0, strategy: { kind: 'none' } });
    for (const d of r.daily) {
      expect(d.deficit_mm).toBeGreaterThanOrEqual(0);
      expect(d.deficit_mm).toBeLessThanOrEqual(75);
    }
    const last = r.daily.at(-1)!;
    expect(last.ks).toBeLessThan(1);
    expect(last.etc_adj_mm).toBeLessThan(5.75);
  });
  it('single step: rain beyond the deficit becomes deep percolation (eq. 88)', () => {
    const s = stepDay({ deficit_mm: 10, taw_mm: 75, raw_mm: 30, etc_mm: 5, rain_eff_mm: 30, net_irrigation_mm: 0 });
    expect(s.deficit_mm).toBe(0);
    expect(s.deep_percolation_mm).toBeCloseTo(15, 10);
  });
});

describe('pre-purchase check (drip vs furrow)', () => {
  it('reproduces the worked example: drip needs ~33 m3 and ~28 pump-hours per 5-day cycle on a 1,200 L/h pump', () => {
    const r = prePurchaseCheck({
      area_m2: 1000,
      net_depth_mm: 30,
      etc_mm_per_day: 5.75,
      flow_lpm: 20,
      pumping_hours_per_day: 6,
      methods: [
        { id: 'furrow', efficiency: 0.6 },
        { id: 'drip', efficiency: 0.9 },
      ],
    });
    const drip = r.find((m) => m.method_id === 'drip')!;
    expect(drip.gross_m3_per_cycle).toBeCloseTo(33.333, 2);
    expect(drip.pump_hours_per_cycle).toBeCloseTo(27.78, 2);
    expect(drip.cycle_days).toBeCloseTo(30 / 5.75, 10);
    expect(drip.flag).toBe('pump_too_small');
    expect(r.find((m) => m.method_id === 'furrow')!.flag).toBe('pump_too_small');
  });
});
