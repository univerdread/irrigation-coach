import { describe, expect, it } from 'vitest';
import { afterAction, freshStart, planFarm, rollToDay, withMoistureCheck, withRain, type FarmInput, type PlotInput } from '../src/index';

const q = (value: number | null, unit: string) => ({ value, unit, provenance: 'simulated' as const });
function farm(over: Partial<PlotInput> = {}): FarmInput {
  return {
    today: '2026-10-03',
    pump: { flow: { kind: 'rate', value: 200, unit: 'L/min', provenance: 'measured' } },
    plots: [
      {
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
      },
    ],
  };
}

describe('shared state transitions (every channel uses these)', () => {
  it('a new day makes rain unknown, so the coach asks', () => {
    const f = rollToDay(farm(), '2026-10-04');
    expect(f.today).toBe('2026-10-04');
    expect(planFarm(f).question?.key).toBe('ask_rain_since');
    expect(rollToDay(f, '2026-10-04')).toBe(f);
  });
  it('reported rain answers the question', () => {
    const f = withRain(rollToDay(farm(), '2026-10-04'), 25, '2026-10-04T07:00');
    expect(planFarm(f).status).toBe('no_pump');
  });
  it("'done' refills the root zone and clears the disagreement count", () => {
    const f0 = farm({ consecutive_disagreements: 1 });
    const f = afterAction(f0, planFarm(f0), { kind: 'done' });
    expect(f.plots[0]!.deficit).toEqual({ mm: 0, as_of: '2026-10-03', provenance: 'estimated' });
    expect(f.plots[0]!.consecutive_disagreements).toBe(0);
  });
  it('a first check with no history sets a labelled starting point', () => {
    const f = withMoistureCheck(farm({ deficit: null, rain_since_mm: null }), 'dry', 'feel_chart', '2026-10-03T08:00');
    expect(f.plots[0]!.deficit).toMatchObject({ mm: 30, provenance: 'estimated' });
    expect(planFarm(f).status).toBe('pump');
  });
  it('disagree, then disagree again -> extension officer; agree -> back to minutes', () => {
    const wet = withMoistureCheck(farm(), 'wet', 'photo_model', '2026-10-03T08:00');
    expect(planFarm(wet).question?.key).toBe('ask_second_check');
    const again = withMoistureCheck(wet, 'wet', 'feel_chart', '2026-10-03T08:10');
    expect(planFarm(again).question?.key).toBe('escalate_extension_officer');
    const agrees = withMoistureCheck(wet, 'dry', 'feel_chart', '2026-10-03T08:10');
    expect(planFarm(agrees).status).toBe('pump');
    expect(agrees.plots[0]!.consecutive_disagreements).toBe(0);
  });
  it('fresh start: soil soaked today', () => {
    const f = freshStart(withMoistureCheck(farm(), 'wet', 'feel_chart', '2026-10-03T08:00'));
    const plan = planFarm(f);
    expect(plan.status).toBe('no_pump');
    expect(f.plots[0]!.deficit?.provenance).toBe('reported');
  });
});
