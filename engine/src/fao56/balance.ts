// FAO-56 chapter 8: root-zone water balance (eqs 84-88). Plain arithmetic on purpose:
// an extension officer can check every step by hand.
import { grossLitres } from '../units';

export interface StepInput {
  /** Depletion at the end of the previous day, mm. */
  deficit_mm: number;
  taw_mm: number;
  raw_mm: number;
  /** Unstressed crop ET for the day, Kc x ETo, mm. */
  etc_mm: number;
  /** Rain reaching the soil (P - RO), mm, before the field-capacity bound. */
  rain_eff_mm: number;
  /** Net irrigation reaching the root zone, mm. */
  net_irrigation_mm: number;
}

export interface StepResult {
  deficit_mm: number;
  ks: number;
  etc_adj_mm: number;
  deep_percolation_mm: number;
}

/** Water stress coefficient (eq. 84), from the depletion at the start of the day. */
export function waterStressKs(deficitMm: number, tawMm: number, rawMm: number): number {
  if (deficitMm <= rawMm) return 1;
  if (tawMm <= rawMm) return 0;
  return Math.max(0, (tawMm - deficitMm) / (tawMm - rawMm));
}

/**
 * One day of the balance: Dr,i = Dr,i-1 - (P - RO) - I + ETc,adj + DP, bounded 0 <= Dr <= TAW.
 * Ks is evaluated after the day's water inputs (irrigation is applied in the morning), so a plot
 * refilled today is not treated as stressed today.
 */
export function stepDay(s: StepInput): StepResult {
  const afterInputs = Math.max(0, s.deficit_mm - s.rain_eff_mm - s.net_irrigation_mm);
  const ks = waterStressKs(afterInputs, s.taw_mm, s.raw_mm);
  const etcAdj = ks * s.etc_mm;
  const unbounded = s.deficit_mm - s.rain_eff_mm - s.net_irrigation_mm + etcAdj;
  // eq. 88: water above field capacity drains below the roots the same day.
  const dp = Math.max(0, -unbounded);
  const deficit = Math.min(s.taw_mm, Math.max(0, unbounded));
  return { deficit_mm: deficit, ks, etc_adj_mm: etcAdj, deep_percolation_mm: dp };
}

export type Strategy =
  | { kind: 'coach' } // each morning: if yesterday's deficit >= RAW, replace the whole deficit
  | { kind: 'fixed_daily'; net_mm: number } // habit: same net amount every day
  | { kind: 'none' };

export interface SimulateInput {
  days: number;
  taw_mm: number;
  raw_mm: number;
  area_m2: number;
  efficiency: number;
  /** Unstressed ETc on day d (1-based), mm. */
  etc_mm_per_day: (day: number) => number;
  /** Effective rain on day d (1-based), mm. */
  rain_mm: (day: number) => number;
  initial_deficit_mm: number;
  strategy: Strategy;
}

export interface SimulateResult {
  daily: (StepResult & { day: number; net_irrigation_mm: number; rain_mm: number })[];
  irrigation_days: number[];
  net_irrigation_mm: number;
  gross_litres: number;
  deep_percolation_mm: number;
}

/** Illustrative multi-day run (the worked example's 30-day chart). Not used for the daily recommendation. */
export function simulate(input: SimulateInput): SimulateResult {
  let deficit = input.initial_deficit_mm;
  const daily: SimulateResult['daily'] = [];
  const irrigationDays: number[] = [];
  let net = 0;
  let dp = 0;
  for (let day = 1; day <= input.days; day++) {
    let irr = 0;
    if (input.strategy.kind === 'coach' && deficit >= input.raw_mm) irr = deficit;
    if (input.strategy.kind === 'fixed_daily') irr = input.strategy.net_mm;
    if (irr > 0) irrigationDays.push(day);
    const rain = input.rain_mm(day);
    const r = stepDay({
      deficit_mm: deficit,
      taw_mm: input.taw_mm,
      raw_mm: input.raw_mm,
      etc_mm: input.etc_mm_per_day(day),
      rain_eff_mm: rain,
      net_irrigation_mm: irr,
    });
    deficit = r.deficit_mm;
    net += irr;
    dp += r.deep_percolation_mm;
    daily.push({ ...r, day, net_irrigation_mm: irr, rain_mm: rain });
  }
  return {
    daily,
    irrigation_days: irrigationDays,
    net_irrigation_mm: net,
    gross_litres: grossLitres(input.area_m2, net, input.efficiency),
    deep_percolation_mm: dp,
  };
}
