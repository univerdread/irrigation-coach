import { describe, expect, it } from 'vitest';
import {
  dayOfYear,
  extraterrestrialRadiation,
  hargreavesEt0,
  kcForDay,
  kcForStage,
  getCrop,
  saxtonRawls,
  dailyEtc,
  omPctFromOcGPerKg,
  usdaTextureClass,
  ribbonTextureClass,
  TEXTURE_CENTROIDS,
  updateTextureWithRibbon,
} from '../src/index';

describe('FAO-56 extraterrestrial radiation (eqs 21-25)', () => {
  it('reproduces FAO-56 Example 8: 20°S on 3 September = 32.2 MJ/m2/day', () => {
    expect(dayOfYear('2026-09-03')).toBe(246);
    expect(extraterrestrialRadiation(-20, 246)).toBeCloseTo(32.2, 1);
  });
  it('day of year handles leap years', () => {
    expect(dayOfYear('2028-12-31')).toBe(366);
    expect(dayOfYear('2026-01-01')).toBe(1);
  });
});

describe('Hargreaves ET0 (FAO-56 eq. 52)', () => {
  it('converts Ra from MJ/m2/day to mm/day (x0.408) before applying the formula', () => {
    // Hand calculation: 0.0023 * (22.5 + 17.8) * sqrt(15) * (0.408 * 35) = 5.1269...
    expect(hargreavesEt0(15, 30, 35)).toBeCloseTo(0.0023 * 40.3 * Math.sqrt(15) * 0.408 * 35, 10);
    expect(hargreavesEt0(15, 30, 35)).toBeCloseTo(5.127, 2);
  });
  it('rejects tmax < tmin', () => {
    expect(() => hargreavesEt0(20, 10, 35)).toThrow(RangeError);
  });
});

describe('crop coefficients (FAO-56 single Kc curve, eq. 66)', () => {
  const tomato = getCrop('tomato');
  it('flat during ini, interpolated during dev, flat in mid, down to Kc end', () => {
    expect(kcForDay(tomato, 0)).toBeCloseTo(0.6, 10);
    expect(kcForDay(tomato, 30)).toBeCloseTo(0.6, 10);
    expect(kcForDay(tomato, 50)).toBeCloseTo((0.6 + 1.15) / 2, 10);
    expect(kcForDay(tomato, 90)).toBeCloseTo(1.15, 10);
    expect(kcForDay(tomato, 135)).toBeCloseTo(0.8, 10);
    expect(kcForDay(tomato, 400)).toBeCloseTo(0.8, 10);
  });
  it('stage-only Kc uses the stage representative value', () => {
    expect(kcForStage(tomato, 'mid')).toBe(1.15);
    expect(kcForStage(tomato, 'dev')).toBeCloseTo(0.875, 10);
  });
  it('unknown crop throws', () => {
    expect(() => getCrop('mango')).toThrow();
  });
});

describe('Saxton & Rawls (2006) pedotransfer', () => {
  // Saxton & Rawls 2006 Table 3, OM = 2.5%: [class, sand%, clay%, PWP%, FC%, AW cm/cm, Ksat mm/h]
  const table3: [string, number, number, number, number, number, number][] = [
    ['sand', 88, 5, 5, 10, 0.05, 108.1],
    ['loamy sand', 80, 5, 5, 12, 0.07, 96.7],
    ['sandy loam', 65, 10, 8, 18, 0.1, 50.3],
    ['loam', 40, 20, 14, 28, 0.14, 15.5],
    ['silt loam', 20, 15, 11, 31, 0.2, 16.1],
    ['silt', 10, 5, 6, 30, 0.25, 22.0],
    ['sandy clay loam', 60, 25, 17, 27, 0.1, 11.3],
    ['clay loam', 30, 35, 22, 36, 0.14, 4.3],
    ['silty clay loam', 10, 35, 22, 38, 0.17, 5.7],
    ['silty clay', 10, 45, 27, 41, 0.14, 3.7],
    ['sandy clay', 50, 40, 25, 36, 0.11, 1.4],
    ['clay', 25, 50, 30, 42, 0.12, 1.1],
  ];
  for (const [name, sand, clay, pwp, fc, aw, ksat] of table3) {
    it(`reproduces Table 3: ${name}`, () => {
      const r = saxtonRawls({ sand_pct: sand, clay_pct: clay, om_pct: 2.5 });
      expect(Math.abs(r.theta_wp * 100 - pwp)).toBeLessThanOrEqual(0.6);
      expect(Math.abs(r.theta_fc * 100 - fc)).toBeLessThanOrEqual(0.6);
      expect(Math.abs(r.theta_fc - r.theta_wp - aw)).toBeLessThanOrEqual(0.006);
      expect(r.awc_mm_per_m).toBeCloseTo((r.theta_fc - r.theta_wp) * 1000, 10);
      expect(r.ksat_mm_per_h).toBeCloseTo(ksat, 1);
    });
  }
  it('more organic matter raises water holding only modestly (idea doc: be honest about humus)', () => {
    const lo = saxtonRawls({ sand_pct: 65, clay_pct: 10, om_pct: 1 }).awc_mm_per_m;
    const hi = saxtonRawls({ sand_pct: 65, clay_pct: 10, om_pct: 4 }).awc_mm_per_m;
    expect(hi).toBeGreaterThan(lo);
    expect((hi - lo) / lo).toBeLessThan(0.35);
  });
  it('flags inputs outside the calibration range', () => {
    expect(saxtonRawls({ sand_pct: 20, clay_pct: 70, om_pct: 2 }).warnings).toContain('clay_above_60');
    expect(saxtonRawls({ sand_pct: 40, clay_pct: 20, om_pct: 10 }).warnings).toContain('om_above_8');
  });
  it('organic matter from iSDAsoil organic carbon (g/kg) uses the 1.72 factor', () => {
    expect(omPctFromOcGPerKg(10)).toBeCloseTo(1.72, 10);
  });
});

describe('USDA texture triangle and ribbon test', () => {
  it('classifies every centroid into its own class', () => {
    for (const [cls, c] of Object.entries(TEXTURE_CENTROIDS)) {
      expect(usdaTextureClass(c.sand_pct, c.clay_pct), cls).toBe(cls);
    }
  });
  it('follows the feel flowchart (Thien 1979)', () => {
    expect(ribbonTextureClass({ forms_ball: false })).toBe('sand');
    expect(ribbonTextureClass({ forms_ball: true, ribbon: 'none' })).toBe('loamy sand');
    expect(ribbonTextureClass({ forms_ball: true, ribbon: 'short', feel: 'gritty' })).toBe('sandy loam');
    expect(ribbonTextureClass({ forms_ball: true, ribbon: 'short', feel: 'neither' })).toBe('loam');
    expect(ribbonTextureClass({ forms_ball: true, ribbon: 'medium', feel: 'smooth' })).toBe('silty clay loam');
    expect(ribbonTextureClass({ forms_ball: true, ribbon: 'long', feel: 'neither' })).toBe('clay');
    expect(ribbonTextureClass({ forms_ball: true, ribbon: 'short' })).toBeNull();
  });
  it('ribbon update is weighted by the map uncertainty', () => {
    const ribbon = TEXTURE_CENTROIDS['clay loam'];
    const unsure = updateTextureWithRibbon({ sand_pct: 65, sand_sd: 25, clay_pct: 10, clay_sd: 20 }, 'clay loam');
    const sure = updateTextureWithRibbon({ sand_pct: 65, sand_sd: 3, clay_pct: 10, clay_sd: 3 }, 'clay loam');
    // An unsure map moves most of the way to the ribbon; a confident map barely moves.
    expect(Math.abs(unsure.sand_pct - ribbon.sand_pct)).toBeLessThan(Math.abs(unsure.sand_pct - 65));
    expect(Math.abs(sure.sand_pct - 65)).toBeLessThan(Math.abs(sure.sand_pct - ribbon.sand_pct));
    expect(unsure.sand_sd).toBeLessThan(25);
  });
});

describe('daily ETc series from climatology', () => {
  it('is Kc x Hargreaves(month climatology, Ra of that day)', () => {
    const tmax = Array(12).fill(30);
    const tmin = Array(12).fill(10);
    const s = dailyEtc({ lat_deg: -2.8, tmax_c: tmax, tmin_c: tmin, crop_id: 'tomato', stage: 'mid', start: '2026-10-03', days: 3 });
    expect(s.map((d) => d.date)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05']);
    const ra = extraterrestrialRadiation(-2.8, dayOfYear('2026-10-03'));
    expect(s[0]!.et0_mm).toBeCloseTo(hargreavesEt0(10, 30, ra), 12);
    expect(s[0]!.etc_mm).toBeCloseTo(1.15 * s[0]!.et0_mm, 12);
  });
  it('follows the planting date through the Kc curve', () => {
    const s = dailyEtc({ lat_deg: 0, tmax_c: Array(12).fill(30), tmin_c: Array(12).fill(15), crop_id: 'tomato', planting_date: '2026-10-01', start: '2026-10-01', days: 120 });
    expect(s[0]!.kc).toBeCloseTo(0.6, 10);
    expect(s[90]!.kc).toBeCloseTo(1.15, 10);
  });
});
