import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { planFarm, type FarmInput } from '../src/index';
import { CONTRACTS, close, readDirJson } from './helpers';

interface Golden {
  id: string;
  description: string;
  input: FarmInput;
  expected: {
    status?: string;
    question_key?: string;
    question_params?: Record<string, string | number>;
    total_litres?: number;
    total_minutes?: number;
    plots?: Record<string, Record<string, string | number>>;
  };
}

const fixtures = readDirJson<Golden>(join(CONTRACTS, 'fixtures', 'golden'));

describe('golden fixtures (contracts/fixtures/golden)', () => {
  it('found the fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(6);
  });

  for (const { file, data: g } of fixtures) {
    it(`${g.id}: ${g.description}`, () => {
      const plan = planFarm(g.input);
      const e = g.expected;
      if (e.status) expect(plan.status, file).toBe(e.status);
      if (e.question_key) expect(plan.question?.key, file).toBe(e.question_key);
      if (e.question_params) expect(plan.question?.params, file).toEqual(e.question_params);
      if (e.total_litres !== undefined) expect(close(plan.total_litres, e.total_litres), `${file} total_litres ${plan.total_litres}`).toBe(true);
      if (e.total_minutes !== undefined) expect(close(plan.total_minutes, e.total_minutes), `${file} total_minutes ${plan.total_minutes}`).toBe(true);
      for (const [plotId, exp] of Object.entries(e.plots ?? {})) {
        const p = plan.plots.find((x) => x.plot_id === plotId);
        expect(p, `${file} plot ${plotId}`).toBeDefined();
        for (const [k, v] of Object.entries(exp)) {
          const actual = (p as unknown as Record<string, unknown>)[k];
          if (typeof v === 'number') expect(close(actual as number, v), `${file} ${plotId}.${k} = ${String(actual)}, want ${v}`).toBe(true);
          else expect(actual, `${file} ${plotId}.${k}`).toBe(v);
        }
      }
    });
  }
});

describe('golden invariants', () => {
  for (const { data: g } of fixtures) {
    it(`${g.id}: paused means no minutes anywhere`, () => {
      const plan = planFarm(g.input);
      for (const p of plan.plots) {
        if (p.status === 'paused') {
          expect(p.minutes).toBe(0);
          expect(p.allocated_litres).toBe(0);
        }
      }
      if (plan.status === 'paused') expect(plan.total_minutes).toBe(0);
    });
    it(`${g.id}: allocated + unmet = requested, totals add up`, () => {
      const plan = planFarm(g.input);
      let sum = 0;
      for (const p of plan.plots) {
        expect(close(p.allocated_litres + p.unmet_litres, p.requested_litres)).toBe(true);
        sum += p.allocated_litres;
      }
      expect(close(plan.total_litres, sum)).toBe(true);
      if (plan.cap_litres !== null) expect(plan.total_litres).toBeLessThanOrEqual(plan.cap_litres + 1e-9);
    });
    it(`${g.id}: simulated inputs are flagged`, () => {
      const plan = planFarm(g.input);
      expect(plan.data_quality.simulated).toBe(true);
    });
  }
});
