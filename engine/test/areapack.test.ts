import { describe, expect, it } from 'vitest';
import { lookupAreaPack, type AreaPack } from '../src/index';

function b64(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes));
}
// 2x2 grid, north-west corner at (-2.80, 37.50), 0.01 deg cells.
const pack: AreaPack = {
  schema_version: '0.1.0',
  area_id: 'test',
  name: 'test',
  built_at: '2026-10-03',
  simulated: true,
  grid: { west: 37.5, north: -2.8, cell_deg: 0.01, width: 2, height: 2 },
  layers: {
    sand_pct: { encoding: 'uint8', transform: { kind: 'linear', scale: 1, offset: 0 }, nodata: 255, data_b64: b64([60, 61, 62, 255]), source: 'test' },
    clay_pct: { encoding: 'uint8', transform: { kind: 'linear', scale: 1, offset: 0 }, nodata: 255, data_b64: b64([20, 21, 22, 255]), source: 'test' },
    oc_g_per_kg: { encoding: 'uint8', transform: { kind: 'expm1_div10' }, nodata: 255, data_b64: b64([24, 24, 24, 255]), source: 'test' },
  },
  climatology: { source: 'test', lat: -2.8, lon: 37.5, tmax_c: Array(12).fill(29), tmin_c: Array(12).fill(9), rain_mm_per_day: Array(12).fill(1) },
  licenses: ['test'],
};

describe('area pack lookup', () => {
  it('reads the right cell (row 0 = north edge) and back-transforms organic carbon', () => {
    const ne = lookupAreaPack(pack, -2.805, 37.515);
    expect(ne?.values.sand_pct).toBe(61);
    expect(ne?.values.oc_g_per_kg).toBeCloseTo(Math.expm1(2.4), 10);
    const sw = lookupAreaPack(pack, -2.815, 37.505);
    expect(sw?.values.sand_pct).toBe(62);
  });
  it('nodata is null and outside the pack is null', () => {
    expect(lookupAreaPack(pack, -2.815, 37.515)?.values.sand_pct).toBeNull();
    expect(lookupAreaPack(pack, -3.5, 37.5)).toBeNull();
  });
});

describe('real demo area pack (built by data/build_area_pack.py from open data)', () => {
  it('validates against the schema and decodes plausible soil at Kimana', async () => {
    const { readFileSync, readdirSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const Ajv2020 = (await import('ajv/dist/2020')).default;
    const path = join(import.meta.dirname, '..', '..', 'app', 'src', 'demo', 'packs', 'ke-kajiado-kimana-demo.json');
    if (!existsSync(path)) return;
    const schemas = join(import.meta.dirname, '..', '..', 'contracts', 'schemas');
    const ajv = new Ajv2020({ strict: false });
    for (const f of readdirSync(schemas).filter((f) => f.endsWith('.json'))) ajv.addSchema(JSON.parse(readFileSync(join(schemas, f), 'utf8')));
    const real = JSON.parse(readFileSync(path, 'utf8')) as AreaPack;
    const validate = ajv.getSchema('urn:irrigation-coach:area-pack')!;
    expect(validate(real), JSON.stringify(validate.errors)).toBe(true);
    const v = lookupAreaPack(real, -2.8, 37.53)!.values;
    expect(v.sand_pct! + v.clay_pct!).toBeLessThanOrEqual(100);
    expect(v.oc_g_per_kg!).toBeGreaterThan(0);
  });
});
