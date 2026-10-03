// USDA texture triangle, the feel/ribbon flowchart, and the map-plus-ribbon update.

export type TextureClass =
  | 'sand'
  | 'loamy sand'
  | 'sandy loam'
  | 'loam'
  | 'silt loam'
  | 'silt'
  | 'sandy clay loam'
  | 'clay loam'
  | 'silty clay loam'
  | 'sandy clay'
  | 'silty clay'
  | 'clay';

/** USDA texture class from sand and clay (%); silt = 100 - sand - clay. */
export function usdaTextureClass(sandPct: number, clayPct: number): TextureClass {
  const sand = sandPct;
  const clay = clayPct;
  const silt = 100 - sand - clay;
  if (silt + 1.5 * clay < 15) return 'sand';
  if (silt + 2 * clay < 30) return 'loamy sand';
  if (clay >= 40 && silt >= 40) return 'silty clay';
  if (clay >= 35 && sand > 45) return 'sandy clay';
  if (clay >= 40) return 'clay';
  if (clay >= 27 && sand <= 20) return 'silty clay loam';
  if (clay >= 27 && sand > 20 && sand <= 45) return 'clay loam';
  if (clay >= 20 && silt < 28 && sand > 45) return 'sandy clay loam';
  if (silt >= 80 && clay < 12) return 'silt';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'silt loam';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'loam';
  return 'sandy loam';
}

/** Representative sand/clay per class: Saxton & Rawls (2006) Table 3. */
export const TEXTURE_CENTROIDS: Record<TextureClass, { sand_pct: number; clay_pct: number }> = {
  sand: { sand_pct: 88, clay_pct: 5 },
  'loamy sand': { sand_pct: 80, clay_pct: 5 },
  'sandy loam': { sand_pct: 65, clay_pct: 10 },
  loam: { sand_pct: 40, clay_pct: 20 },
  'silt loam': { sand_pct: 20, clay_pct: 15 },
  silt: { sand_pct: 10, clay_pct: 5 },
  'sandy clay loam': { sand_pct: 60, clay_pct: 25 },
  'clay loam': { sand_pct: 30, clay_pct: 35 },
  'silty clay loam': { sand_pct: 10, clay_pct: 35 },
  'sandy clay': { sand_pct: 50, clay_pct: 40 },
  'silty clay': { sand_pct: 10, clay_pct: 45 },
  clay: { sand_pct: 25, clay_pct: 50 },
};

export interface RibbonTaps {
  /** Does moist soil squeeze into a ball? */
  forms_ball?: boolean;
  /** Ribbon pushed out between thumb and finger: none, short (<2.5 cm), medium (2.5-5 cm), long (>5 cm). */
  ribbon?: 'none' | 'short' | 'medium' | 'long';
  /** Feel of a wet pinch. */
  feel?: 'gritty' | 'smooth' | 'neither';
}

/** Texture-by-feel flowchart (Thien 1979, as used by USDA NRCS). null = not enough taps yet. */
export function ribbonTextureClass(t: RibbonTaps): TextureClass | null {
  if (t.forms_ball === undefined) return null;
  if (!t.forms_ball) return 'sand';
  if (t.ribbon === undefined) return null;
  if (t.ribbon === 'none') return 'loamy sand';
  if (t.feel === undefined) return null;
  const table: Record<'short' | 'medium' | 'long', Record<'gritty' | 'smooth' | 'neither', TextureClass>> = {
    short: { gritty: 'sandy loam', smooth: 'silt loam', neither: 'loam' },
    medium: { gritty: 'sandy clay loam', smooth: 'silty clay loam', neither: 'clay loam' },
    long: { gritty: 'sandy clay', smooth: 'silty clay', neither: 'clay' },
  };
  return table[t.ribbon][t.feel];
}

export interface TextureEstimate {
  sand_pct: number;
  sand_sd: number;
  clay_pct: number;
  clay_sd: number;
}

/**
 * How far a ribbon class is trusted, in percentage points (1 SD). DEMO ASSUMPTION: roughly half
 * a texture-class width. Replace with a measured feel-vs-lab error once one exists.
 */
export const RIBBON_SD = { sand_pct: 12, clay_pct: 8 };

/**
 * Combine the map prior with the ribbon class by inverse-variance weighting, per component.
 * An unsure map (large SD) moves toward the ribbon; a confident map barely moves.
 */
export function updateTextureWithRibbon(prior: TextureEstimate, ribbon: TextureClass): TextureEstimate {
  const c = TEXTURE_CENTROIDS[ribbon];
  const fuse = (m1: number, s1: number, m2: number, s2: number) => {
    const w1 = 1 / (s1 * s1);
    const w2 = 1 / (s2 * s2);
    return { mean: (m1 * w1 + m2 * w2) / (w1 + w2), sd: Math.sqrt(1 / (w1 + w2)) };
  };
  const sand = fuse(prior.sand_pct, Math.max(prior.sand_sd, 0.1), c.sand_pct, RIBBON_SD.sand_pct);
  const clay = fuse(prior.clay_pct, Math.max(prior.clay_sd, 0.1), c.clay_pct, RIBBON_SD.clay_pct);
  let sandPct = Math.max(0, sand.mean);
  let clayPct = Math.max(0, clay.mean);
  if (sandPct + clayPct > 100) {
    const k = 100 / (sandPct + clayPct);
    sandPct *= k;
    clayPct *= k;
  }
  return { sand_pct: sandPct, sand_sd: sand.sd, clay_pct: clayPct, clay_sd: clay.sd };
}
