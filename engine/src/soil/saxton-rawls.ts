// Saxton, K.E. & Rawls, W.J. (2006). Soil water characteristic estimates by texture and organic
// matter for hydrologic solutions. Soil Sci. Soc. Am. J. 70:1569-1578.
// Equations checked against an independent implementation (dssatR saxton_rawls_06.R) and
// against the paper's Table 3 for all 12 texture classes (see test/science.test.ts).

export interface SoilTexture {
  sand_pct: number;
  clay_pct: number;
  /** Organic matter, % by weight (not organic carbon). */
  om_pct: number;
}

export interface SoilWater {
  /** Volumetric water content at 1500 kPa (wilting point), m3/m3. */
  theta_wp: number;
  /** Volumetric water content at 33 kPa (field capacity), m3/m3. */
  theta_fc: number;
  theta_sat: number;
  /** Available water capacity, mm of water per m of soil. */
  awc_mm_per_m: number;
  ksat_mm_per_h: number;
  warnings: ('clay_above_60' | 'om_above_8' | 'texture_out_of_range')[];
}

/** Organic matter (%) from organic carbon (g/kg), using the conventional 1.72 factor. */
export function omPctFromOcGPerKg(ocGPerKg: number): number {
  return (ocGPerKg / 10) * 1.72;
}

export function saxtonRawls({ sand_pct, clay_pct, om_pct }: SoilTexture): SoilWater {
  const warnings: SoilWater['warnings'] = [];
  if (sand_pct < 0 || clay_pct < 0 || sand_pct + clay_pct > 100) warnings.push('texture_out_of_range');
  if (clay_pct > 60) warnings.push('clay_above_60');
  if (om_pct > 8) warnings.push('om_above_8');

  // Sand and clay as decimal fractions; organic matter in %w.
  const S = sand_pct / 100;
  const C = clay_pct / 100;
  const OM = om_pct;

  const t1500t = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031;
  const t1500 = t1500t + (0.14 * t1500t - 0.02);

  const t33t = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299;
  const t33 = t33t + (1.283 * t33t * t33t - 0.374 * t33t - 0.015);

  const ts33t = 0.278 * S + 0.034 * C + 0.022 * OM - 0.018 * S * OM - 0.027 * C * OM - 0.584 * S * C + 0.078;
  const ts33 = ts33t + (0.636 * ts33t - 0.107);

  const tS = t33 + ts33 - 0.097 * S + 0.043;

  const B = (Math.log(1500) - Math.log(33)) / (Math.log(t33) - Math.log(t1500));
  const lambda = 1 / B;
  const ksat = 1930 * Math.pow(tS - t33, 3 - lambda);

  return {
    theta_wp: t1500,
    theta_fc: t33,
    theta_sat: tS,
    awc_mm_per_m: (t33 - t1500) * 1000,
    ksat_mm_per_h: ksat,
    warnings,
  };
}
