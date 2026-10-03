import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import { planFarm, type FarmInput } from '../src/index';
import { CONTRACTS, readDirJson, readJson } from './helpers';

function makeAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  for (const { data } of [
    ...readDirJson<object>(join(CONTRACTS, 'schemas')),
    ...readDirJson<object>(join(CONTRACTS, 'schemas', 'ai')),
  ]) {
    ajv.addSchema(data);
  }
  return ajv;
}

describe('contracts', () => {
  const ajv = makeAjv();

  it('all schemas compile', () => {
    for (const id of ['common', 'farm-input', 'farm-plan', 'log-entry', 'area-pack', 'golden-fixture', 'ai:soil-photo', 'ai:explain', 'ai:question']) {
      expect(ajv.getSchema(`urn:irrigation-coach:${id}`), id).toBeDefined();
    }
  });

  for (const { file, data } of readDirJson<{ input: FarmInput }>(join(CONTRACTS, 'fixtures', 'golden'))) {
    it(`fixture ${file} matches golden-fixture schema`, () => {
      const validate = ajv.getSchema('urn:irrigation-coach:golden-fixture')!;
      expect(validate(data), JSON.stringify(validate.errors, null, 1)).toBe(true);
    });
    it(`engine output for ${file} matches farm-plan schema`, () => {
      const validate = ajv.getSchema('urn:irrigation-coach:farm-plan')!;
      const plan = planFarm(data.input);
      expect(validate(plan), JSON.stringify(validate.errors, null, 1)).toBe(true);
    });
  }

  it('example log entry matches log-entry schema', () => {
    const validate = ajv.getSchema('urn:irrigation-coach:log-entry')!;
    const g = readJson<{ input: FarmInput }>(join(CONTRACTS, 'fixtures', 'golden', '01-single-plot.json'));
    const plan = planFarm(g.input);
    const entry = {
      id: 'example-1',
      created_at: '2026-10-03T07:00:00+03:00',
      engine_version: plan.engine_version,
      input: g.input,
      plan,
      action: { kind: 'done', minutes_run: 250, reported_at: '2026-10-03T12:00:00+03:00', provenance: 'reported' },
      explanation: { text: 'Run the pump for 4 h 10 min.', producer: 'template', locale: 'en' },
      events: [],
      shared_with: [],
    };
    expect(validate(entry), JSON.stringify(validate.errors, null, 1)).toBe(true);
  });

  it('crop and method tables carry a source for every crop', () => {
    const crops = readJson<{ crops: { id: string; sources: Record<string, string> }[] }>(join(CONTRACTS, 'data', 'crops.json'));
    for (const c of crops.crops) {
      for (const k of ['kc', 'stage_days', 'root_depth_m', 'p']) expect(c.sources[k], `${c.id}.${k}`).toBeTruthy();
    }
  });
});
