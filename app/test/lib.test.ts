import { describe, expect, it } from 'vitest';
import { planFarm, toLpm } from '@irrigation-coach/engine';
import { polygonAreaM2, pacesAreaM2, gpsAreaRelError, centroid } from '../src/lib/geo';
import { buildMonth, docHabitMinutes } from '../src/lib/month';
import { rollToToday, loadFarm, saveFarm } from '../src/lib/myfarm';
import { startingDeficitMm } from '@irrigation-coach/engine';
import { localToday, weekdayKey } from '../src/lib/time';
import { memoryKV } from '../src/storage/logStore';
import { scenario } from '../src/demo/scenarios';
import { DEMO_AREA } from '../src/demo/area';

describe('plot area', () => {
  it('a ~31.6 m square near the equator is ~1,000 m2', () => {
    const d = 31.6227766 / 111_195; // degrees of latitude for 31.6 m
    const lat = -2.8;
    const dlon = d / Math.cos((lat * Math.PI) / 180);
    const sq = [
      { lat, lon: 37.5 },
      { lat, lon: 37.5 + dlon },
      { lat: lat + d, lon: 37.5 + dlon },
      { lat: lat + d, lon: 37.5 },
    ];
    expect(polygonAreaM2(sq)).toBeCloseTo(1000, -1);
    expect(polygonAreaM2(sq.slice(0, 2))).toBe(0);
    expect(centroid(sq)!.lat).toBeCloseTo(lat + d / 2, 10);
  });
  it('GPS error on a small plot is large, and we say so', () => {
    const d = 31.6227766 / 111_195;
    const sq = [
      { lat: 0, lon: 0, accuracy_m: 5 },
      { lat: 0, lon: d, accuracy_m: 5 },
      { lat: d, lon: d, accuracy_m: 5 },
      { lat: d, lon: 0, accuracy_m: 5 },
    ];
    expect(gpsAreaRelError(sq)!).toBeGreaterThan(0.5);
  });
  it('paces: 42 x 42 paces of 0.75 m is about 1,000 m2', () => {
    expect(pacesAreaM2(42, 42)).toBeCloseTo(992.25, 6);
  });
});

describe('the 30-day month (Season screen)', () => {
  const farm = scenario('single');
  const flow = toLpm(farm.pump.flow)!;
  const habit = docHabitMinutes(1000, 0.6, flow);
  const m = buildMonth(farm, flow, 0, { weather: 'example', habit_minutes: habit, start: farm.today, climate: { lat: DEMO_AREA.lat, tmax_c: DEMO_AREA.tmax_c, tmin_c: DEMO_AREA.tmin_c } })!;

  it("reproduces the idea doc's chart: ~225 m3 with the coach vs 500 m3 by habit", () => {
    expect(habit).toBeCloseTo(83.333, 2);
    expect(m.coach.gross_litres).toBeCloseTo(225_416.67, 1);
    expect(m.habit.gross_litres).toBeCloseTo(500_000, 4);
    expect(m.coach_cum_m3.at(-1)).toBeCloseTo(225.41667, 4);
    expect(m.habit_cum_m3.at(-1)).toBeCloseTo(500, 6);
    expect(m.coach.deep_percolation_mm).toBe(0);
    expect(m.coach_pump_hours).toBeCloseTo(225_416.67 / 200 / 60, 3);
  });
  it('climatology weather gives a different, plausible month', () => {
    const c = buildMonth(farm, flow, 0, { weather: 'climatology', habit_minutes: habit, start: farm.today, climate: { lat: DEMO_AREA.lat, tmax_c: DEMO_AREA.tmax_c, tmin_c: DEMO_AREA.tmin_c } })!;
    expect(c.etc.every((x) => x > 4 && x < 9)).toBe(true);
    expect(c.coach.gross_litres).toBeLessThan(c.habit.gross_litres);
  });
  it('returns null when the plot is incomplete (the UI says what is missing)', () => {
    const f = scenario('single');
    f.plots[0]!.soil_awc_mm_per_m = null;
    expect(buildMonth(f, flow, 0, { weather: 'example', habit_minutes: 60, start: f.today, climate: { lat: 0, tmax_c: [], tmin_c: [] } })).toBeNull();
  });
});

describe('my plot persistence', () => {
  it('saves, loads, and rolls to a new day with rain unknown', () => {
    const kv = memoryKV();
    const f = scenario('single');
    saveFarm(kv, f);
    const loaded = loadFarm(kv)!;
    expect(loaded).toEqual(f);
    const next = rollToToday(loaded, '2026-10-05');
    expect(next.today).toBe('2026-10-05');
    expect(next.plots[0]!.rain_since_mm).toBeNull();
    expect(planFarm(next).question?.key).toBe('ask_rain_since');
    expect(rollToToday(loaded, '2026-10-03')).toBe(loaded);
  });
});

describe('feel check as a starting point', () => {
  it('maps wet/ok/dry to full / halfway / at the watering point', () => {
    expect(startingDeficitMm('wet', 30)).toBe(0);
    expect(startingDeficitMm('ok', 30)).toBe(15);
    expect(startingDeficitMm('dry', 30)).toBe(30);
  });
});

describe('dates', () => {
  it('local today and weekday', () => {
    expect(localToday(new Date(2026, 9, 3, 23, 30))).toBe('2026-10-03');
    expect(weekdayKey('2026-10-03')).toBe('sat');
  });
});

import { niceTicks } from '../src/components/LineChart';
describe('chart axis ticks', () => {
  it('are clean numbers with 3-5 intervals', () => {
    expect(niceTicks(41)).toEqual([0, 20, 40, 60]);
    expect(niceTicks(498)).toEqual([0, 200, 400, 600]);
    expect(niceTicks(225)).toEqual([0, 100, 200, 300]);
    expect(niceTicks(9)).toEqual([0, 5, 10]);
    for (const m of [3, 17, 41, 88, 130, 498, 1234]) {
      const t = niceTicks(m);
      expect(t.at(-1)!).toBeGreaterThanOrEqual(m);
      expect(t.length - 1).toBeGreaterThanOrEqual(2);
      expect(t.length - 1).toBeLessThanOrEqual(5);
    }
  });
});
