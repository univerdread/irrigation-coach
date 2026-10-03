// Daily crop water use series for a plot, from monthly climatology (no weather station, no network).
import { getCrop } from '../tables';
import { addDays, daysBetween } from '../units';
import { dayOfYear, extraterrestrialRadiation, hargreavesEt0 } from './radiation';
import { kcForDay, kcForStage } from './kc';
import type { CropStage } from '../types';

export interface EtcSeriesInput {
  lat_deg: number;
  /** Monthly climatology, January first. */
  tmax_c: number[];
  tmin_c: number[];
  crop_id: string;
  stage?: CropStage | null;
  planting_date?: string;
  /** First day of the series (YYYY-MM-DD). */
  start: string;
  days: number;
}

export interface EtcDay {
  date: string;
  et0_mm: number;
  kc: number;
  etc_mm: number;
}

/** Unstressed ETc = Kc x Hargreaves ETo for each day. Kc follows the planting date when given, else the stage. */
export function dailyEtc(i: EtcSeriesInput): EtcDay[] {
  const crop = getCrop(i.crop_id);
  const out: EtcDay[] = [];
  for (let d = 0; d < i.days; d++) {
    const date = addDays(i.start, d);
    const m = Number(date.slice(5, 7)) - 1;
    const et0 = hargreavesEt0(i.tmin_c[m]!, i.tmax_c[m]!, extraterrestrialRadiation(i.lat_deg, dayOfYear(date)));
    const kc = i.planting_date ? kcForDay(crop, daysBetween(i.planting_date, date)) : kcForStage(crop, i.stage ?? 'mid');
    out.push({ date, et0_mm: et0, kc, etc_mm: kc * et0 });
  }
  return out;
}
