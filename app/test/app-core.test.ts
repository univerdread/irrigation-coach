import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { planFarm, type FarmPlan } from '@irrigation-coach/engine';
import en from '../src/i18n/en.json';
import sw from '../src/i18n/sw.json';
import farmPlanSchema from '../../contracts/schemas/farm-plan.schema.json';
import commonSchema from '../../contracts/schemas/common.schema.json';
import { t } from '../src/i18n/i18n';
import { displayMinutes, formatDuration } from '../src/format';
import { extractNumbers, verifyNumbers } from '../src/ai/guard';
import { explain } from '../src/ai/explain';
import { allowedNumbers, explainTemplate } from '../src/ai/templates';
import { mockSoilClassifier } from '../src/ai/mock';
import type { TextModel } from '../src/ai/types';
import { LogStore, memoryKV, type LogEntry } from '../src/storage/logStore';
import { SCENARIOS, scenario } from '../src/demo/scenarios';

describe('translations', () => {
  it('English and Kiswahili have the same keys', () => {
    expect(Object.keys(sw).sort()).toEqual(Object.keys(en).sort());
  });
  it('every question, reason and warning the engine can emit has a string', () => {
    const qKeys = (commonSchema.$defs.question_key.enum as string[]).map((k) => `q.${k}`);
    const reasons = (farmPlanSchema.$defs.plot_plan.properties.reason.enum as string[]).map((k) => `reason.${k}`);
    const warnings = (farmPlanSchema.$defs.warning.properties.code.enum as string[]).map((k) => `w.${k}`);
    for (const k of [...qKeys, ...reasons, ...warnings]) {
      expect(en, k).toHaveProperty([k]);
      expect(sw, k).toHaveProperty([k]);
    }
  });
  it('placeholders match between languages', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [k, v] of Object.entries(en)) {
      if (typeof v !== 'string') continue;
      expect(ph((sw as Record<string, unknown>)[k] as string), k).toEqual(ph(v));
    }
  });
});

describe('display rounding (engine stays exact)', () => {
  it("renders the worked example as the idea doc's sentence", () => {
    expect(formatDuration('en', 250)).toBe('4 h 10 min');
    expect(t('sw', 'plan.pump', { duration: formatDuration('sw', 250) })).toBe('Washa pampu kwa saa 4 na dakika 10 leo');
  });
  it('rounds to 5 minutes and never shows 0 when pumping is due', () => {
    expect(displayMinutes(251.3)).toBe(250);
    expect(displayMinutes(1.2)).toBe(5);
    expect(displayMinutes(0)).toBe(0);
  });
});

describe('number guard for model text', () => {
  it('extracts digits, thousands separators and comma decimals', () => {
    expect(extractNumbers('Run 4 h 10 min, 50,000 L, 2,5 mm')).toEqual([4, 10, 50000, 2.5]);
  });
  it('rejects unknown numbers and spelled-out numbers', () => {
    expect(verifyNumbers('Run for 4 h 10 min.', [4, 10]).ok).toBe(true);
    expect(verifyNumbers('Run for 5 h.', [4, 10])).toMatchObject({ ok: false, reason: 'unknown_number', value: 5 });
    expect(verifyNumbers('Run for four hours.', [4])).toMatchObject({ ok: false, reason: 'number_word' });
    expect(verifyNumbers('Washa kwa saa nne.', [4])).toMatchObject({ ok: false, reason: 'number_word', word: 'nne' });
  });
});

describe('explanation: model if its numbers check out, template otherwise', () => {
  const plan = planFarm(scenario('single'));
  const model = (text: string): TextModel => ({ id: 'fake', explain: async () => ({ text, model_id: 'fake-1' }) });

  it('uses the template when no model is loaded', async () => {
    expect(await explain(plan, 'en', null)).toEqual({ text: explainTemplate(plan, 'en'), producer: 'template' });
  });
  it('accepts model text whose numbers are all in the plan', async () => {
    const r = await explain(plan, 'en', model('Your tomatoes used 30 mm. Pump 4 h 10 min, about 50,000 litres.'));
    expect(r.producer).toBe('model');
  });
  it('falls back when the model invents a number', async () => {
    const r = await explain(plan, 'en', model('Pump for 3 hours to save 20% fuel.'));
    expect(r.producer).toBe('template');
    expect(r.rejected).toMatchObject({ ok: false, reason: 'unknown_number' });
  });
  it('falls back when the model throws', async () => {
    const broken: TextModel = { id: 'broken', explain: async () => Promise.reject(new Error('OOM')) };
    expect((await explain(plan, 'en', broken)).producer).toBe('template');
  });
  it('the template itself passes the guard (it only uses allowed numbers)', () => {
    for (const s of SCENARIOS) {
      const p = planFarm(scenario(s.id));
      for (const loc of ['en', 'sw'] as const) {
        expect(verifyNumbers(explainTemplate(p, loc), allowedNumbers(p)), `${s.id}/${loc}`).toEqual({ ok: true });
      }
    }
  });
});

describe('mock soil classifier', () => {
  it('always labels its output as mocked', async () => {
    const r = await mockSoilClassifier.classify({ image: { mime: 'image/jpeg', width: 1, height: 1 }, taps: { forms_ball: true, ribbon: 'long' } });
    expect(r.mocked).toBe(true);
  });
});

// Acceptance (build addendum): in flight mode the app opens, computes, runs the AI function,
// and saves and reopens a log. This is the automated half; the phone half is docs/ACCEPTANCE.md.
describe('core path with the network stubbed out', () => {
  const g = globalThis as Record<string, unknown>;
  const saved: Record<string, unknown> = {};
  const calls: string[] = [];
  beforeEach(() => {
    for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
      saved[k] = g[k];
      g[k] = vi.fn(() => {
        calls.push(k);
        throw new Error(`network: ${k}`);
      });
    }
  });
  afterEach(() => {
    for (const k of Object.keys(saved)) g[k] = saved[k];
  });

  it('computes, explains, logs, reopens and recomputes identically', async () => {
    const kv = memoryKV();
    for (const s of SCENARIOS) {
      const input = scenario(s.id);
      const plan: FarmPlan = planFarm(input);
      const ex = await explain(plan, 'sw', null);
      const entry: LogEntry = {
        id: s.id,
        created_at: '2026-10-03T07:00:00Z',
        engine_version: plan.engine_version,
        input,
        plan,
        action: { kind: 'pending' },
        explanation: { text: ex.text, producer: ex.producer, locale: 'sw' },
      };
      new LogStore(kv).append(entry);
    }
    const reopened = new LogStore(kv).all();
    expect(reopened).toHaveLength(SCENARIOS.length);
    for (const e of reopened) expect(planFarm(e.input)).toEqual(e.plan);
    expect(calls).toEqual([]);
  });
});
