// FAO Irrigation and Drainage Paper 56, chapter 3: extraterrestrial radiation and Hargreaves ETo.
import { utcDay } from '../units';

const GSC = 0.082; // solar constant, MJ m-2 min-1

export function dayOfYear(date: string): number {
  const t = utcDay(date);
  const jan1 = Date.UTC(new Date(t).getUTCFullYear(), 0, 1);
  return Math.round((t - jan1) / 86_400_000) + 1;
}

/** Ra in MJ m-2 day-1 (FAO-56 eqs 21-25). Latitude in degrees, south negative. */
export function extraterrestrialRadiation(latDeg: number, doy: number): number {
  const phi = (Math.PI / 180) * latDeg;
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * doy);
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * doy - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * GSC * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
}

/** MJ m-2 day-1 to equivalent evaporation, mm/day (FAO-56 eq. 20). */
export const MJ_TO_MM = 0.408;

/**
 * Hargreaves reference evapotranspiration, mm/day (FAO-56 eq. 52).
 * Ra is given in MJ m-2 day-1 and converted to mm/day here: eq. 52 expects mm/day,
 * which the idea doc's formula leaves implicit (a 2.45x error if missed).
 */
export function hargreavesEt0(tminC: number, tmaxC: number, raMJ: number): number {
  if (tmaxC < tminC) throw new RangeError(`tmax ${tmaxC} < tmin ${tminC}`);
  const tmean = (tmaxC + tminC) / 2;
  return 0.0023 * (tmean + 17.8) * Math.sqrt(tmaxC - tminC) * MJ_TO_MM * raMJ;
}
