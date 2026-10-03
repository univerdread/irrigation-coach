import { describe, expect, it } from 'vitest';
import {
  planFarm,
  toLpm,
  nextDeficitState,
  createFao56DeficitSource,
  effectiveRain,
  DEFAULT_RAIN_MODEL,
  type FarmInput,
  type PlotInput,
} from '../src/index';

const q = (value: number | null, unit: string) => ({ value, unit, provenance: 'simulated' as const });

function plot(over: Partial<PlotInput> = {}): PlotInput {
  return {
    id: 'A',
    area_m2: q(1000, 'm2'),
    method: 'furrow',
    efficiency: q(0.6, 'fraction'),
    crop: { crop_id: 'tomato', stage: 'mid', provenance: 'simulated' },
    root_depth_m: q(0.6, 'm'),
    soil_awc_mm_per_m: q(125, 'mm/m'),
    deficit: { mm: 30, as_of: '2026-10-03', provenance: 'simulated' },
    rain_since_mm: q(0, 'mm'),
    ...over,
  };
}
function farm(plots: PlotInput[], over: Partial<FarmInput> = {}): FarmInput {
  return { today: '2026-10-03', pump: { flow: { kind: 'rate', value: 200, unit: 'L/min', provenance: 'measured' } }, plots, ...over };
}

describe('flow normalisation (stored in L/min, converted at input)', () => {
  it('bucket test, m3/h and L/h', () => {
    expect(toLpm({ kind: 'bucket', litres: 20, seconds: 6, provenance: 'measured' })).toBeCloseTo(200, 10);
    expect(toLpm({ kind: 'rate', value: 12, unit: 'm3/h', provenance: 'reported' })).toBeCloseTo(200, 10);
    expect(toLpm({ kind: 'rate', value: 1000, unit: 'L/h', provenance: 'reported' })).toBeCloseTo(16.6667, 4);
  });
  it('unknown or invalid flow is null, never zero', () => {
    expect(toLpm(null)).toBeNull();
    expect(toLpm({ kind: 'rate', value: null, unit: 'L/min', provenance: 'reported' })).toBeNull();
    expect(toLpm({ kind: 'rate', value: 0, unit: 'L/min', provenance: 'reported' })).toBeNull();
  });
});

describe('effective rain step', () => {
  it('is capped at the current deficit and ignores tiny showers', () => {
    expect(effectiveRain(50, 12, { fraction: 1, ignore_below_mm: 0 })).toBe(12);
    expect(effectiveRain(0.5, 12, DEFAULT_RAIN_MODEL)).toBe(0);
    expect(effectiveRain(10, 30, { fraction: 0.8, ignore_below_mm: 1 })).toBeCloseTo(8, 10);
  });
});

describe('pause rule: one question, in a fixed order', () => {
  it('asks for area first when several inputs are missing', () => {
    const plan = planFarm(farm([plot({ area_m2: null, soil_awc_mm_per_m: null, rain_since_mm: null })]));
    expect(plan.status).toBe('paused');
    expect(plan.question?.key).toBe('ask_area');
    expect(plan.plots[0]!.missing).toEqual(['area', 'soil_awc', 'rain_since']);
  });
  it('treats invalid numbers as unknown', () => {
    expect(planFarm(farm([plot({ efficiency: q(1.4, 'fraction') })])).question?.key).toBe('ask_method');
    expect(planFarm(farm([plot({ area_m2: q(-5, 'm2') })])).question?.key).toBe('ask_area');
  });
  it('unknown crop stage with no planting date asks for the stage', () => {
    const plan = planFarm(farm([plot({ crop: { crop_id: 'tomato', stage: null, provenance: 'reported' } })]));
    expect(plan.question?.key).toBe('ask_crop_stage');
  });
  it('derives the stage from the planting date when given', () => {
    const plan = planFarm(farm([plot({ crop: { crop_id: 'tomato', stage: null, planting_date: '2026-07-20', provenance: 'reported' } })]));
    expect(plan.plots[0]!.status).toBe('due');
  });
  it('repeated disagreement (a second disagreeing check) escalates to the extension officer', () => {
    const plan = planFarm(
      farm([
        plot({
          consecutive_disagreements: 1,
          moisture_check: { band: 'wet', observed_at: '2026-10-03T08:00', provenance: 'reported', source: 'feel_chart' },
        }),
      ]),
    );
    expect(plan.question?.key).toBe('escalate_extension_officer');
  });
  it("an 'ok' check never contradicts", () => {
    const plan = planFarm(
      farm([plot({ moisture_check: { band: 'ok', observed_at: '2026-10-03T08:00', provenance: 'reported', source: 'feel_chart' } })]),
    );
    expect(plan.status).toBe('pump');
  });
  it('an older check does not contradict a newer deficit', () => {
    const plan = planFarm(
      farm([plot({ moisture_check: { band: 'wet', observed_at: '2026-09-28T08:00', provenance: 'reported', source: 'feel_chart' } })]),
    );
    expect(plan.status).toBe('pump');
  });
});

describe('guardrails are messages, never numbers', () => {
  it('salt, slope, clay, fertilizer and scarcity raise warnings without changing litres', () => {
    const plain = planFarm(farm([plot()]));
    const flagged = planFarm(
      farm([
        plot({
          context: { salty_water_reported: true, slope_pct: 12, clay_pct: 45, fertilizer_applied_on: '2026-10-02', water_scarce: true },
        }),
      ]),
    );
    const codes = flagged.plots[0]!.warnings.map((w) => w.code);
    expect(codes).toEqual(
      expect.arrayContaining(['salty_water', 'steep_slope_furrow', 'clay_short_sets', 'fertilizer_logged', 'water_scarce_no_expansion']),
    );
    expect(flagged.total_litres).toBe(plain.total_litres);
  });
  it('kale is flagged as using proxy parameters', () => {
    const plan = planFarm(farm([plot({ crop: { crop_id: 'kale', stage: 'mid', provenance: 'reported' } })]));
    expect(plan.plots[0]!.warnings.map((w) => w.code)).toContain('crop_proxy_parameters');
  });
});

describe('state transitions after the farmer acts', () => {
  const input = farm([plot()]);
  const plan = planFarm(input);
  it("'done' refills the root zone: deficit 0 as of today", () => {
    const s = nextDeficitState(input.plots[0]!, plan.plots[0]!, { kind: 'done' }, '2026-10-03');
    expect(s).toEqual({ mm: 0, as_of: '2026-10-03', provenance: 'estimated' });
  });
  it("'adjusted' applies only what was pumped (litres x efficiency / area)", () => {
    const s = nextDeficitState(input.plots[0]!, plan.plots[0]!, { kind: 'adjusted', litres_applied: 25_000 }, '2026-10-03');
    expect(s?.mm).toBeCloseTo(30 - (25_000 * 0.6) / 1000, 10);
  });
  it("'skipped' keeps today's deficit (after rain)", () => {
    const s = nextDeficitState(input.plots[0]!, plan.plots[0]!, { kind: 'skipped' }, '2026-10-03');
    expect(s?.mm).toBe(30);
  });
  it('a paused plot has no next state', () => {
    const paused = planFarm(farm([plot({ rain_since_mm: null })]));
    expect(nextDeficitState(input.plots[0]!, paused.plots[0]!, { kind: 'done' }, '2026-10-03')).toBeNull();
  });
});

describe('FAO-56 deficit source (pluggable, replaces fixtures)', () => {
  // Kimana, Kajiado (NASA POWER climatology, October): Tmax 29.48, Tmin 8.65
  const tmax = [30.09, 30.88, 29.44, 29.29, 26.64, 26.07, 25.57, 27.01, 28.53, 29.48, 29.21, 28.56];
  const tmin = [7.32, 9.26, 10.6, 10.71, 9.59, 7.84, 6.85, 7.59, 6.95, 8.65, 10.53, 10.31];
  const source = createFao56DeficitSource({ lat_deg: -2.8, tmax_c: tmax, tmin_c: tmin });

  it('accumulates crop water use since the last update', () => {
    const p = plot({ deficit: { mm: 0, as_of: '2026-09-28', provenance: 'estimated' } });
    const plan = planFarm(farm([p]), { deficitSource: source });
    const d = plan.plots[0]!.deficit_before_rain_mm!;
    // 5 days of tomato mid-season (Kc 1.15) in Kimana in early October: roughly 4.5-7 mm/day of ETc.
    expect(d).toBeGreaterThan(5 * 4.5);
    expect(d).toBeLessThan(5 * 7);
  });
  it('same-day update adds nothing', () => {
    const plan = planFarm(farm([plot()]), { deficitSource: source });
    expect(plan.plots[0]!.deficit_before_rain_mm).toBeCloseTo(30, 10);
  });
});
