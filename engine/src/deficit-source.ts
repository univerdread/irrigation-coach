// Where today's root-zone deficit comes from. Pluggable behind one interface (build addendum):
// simulated fixtures now, the FAO-56 balance driven by area-pack climatology next, and
// later anything better (sensor colours, a calibrated photo model) without touching the planner.
import { getCrop } from './tables';
import { addDays, daysBetween } from './units';
import { dayOfYear, extraterrestrialRadiation, hargreavesEt0 } from './fao56/radiation';
import { kcForDay, kcForStage } from './fao56/kc';
import { waterStressKs } from './fao56/balance';
import type { DeficitState, PlotInput, Provenance } from './types';

export interface Agronomy {
  taw_mm: number;
  raw_mm: number;
}

export interface DeficitSource {
  readonly id: string;
  /** Deficit carried from state.as_of to `today` with crop water use only (no rain, no irrigation), bounded at TAW. */
  advance(state: DeficitState, today: string, plot: PlotInput, agro: Agronomy): { mm: number; provenance: Provenance };
}

/** Fixtures state today's deficit directly: no water use is added. */
export const fixtureDeficitSource: DeficitSource = {
  id: 'fixture',
  advance(state) {
    return { mm: state.mm, provenance: state.provenance };
  },
};

export interface Fao56SourceConfig {
  lat_deg: number;
  /** Monthly climatology, January first (area pack). */
  tmax_c: number[];
  tmin_c: number[];
}

/** FAO-56 daily balance with Hargreaves ETo from monthly temperature climatology. No weather station, no network. */
export function createFao56DeficitSource(cfg: Fao56SourceConfig): DeficitSource {
  return {
    id: 'fao56-hargreaves-climatology',
    advance(state, today, plot, agro) {
      const n = daysBetween(state.as_of, today);
      let d = state.mm;
      if (n <= 0 || !plot.crop) return { mm: d, provenance: state.provenance };
      const crop = getCrop(plot.crop.crop_id);
      for (let i = 1; i <= n; i++) {
        const date = addDays(state.as_of, i);
        const month = Number(date.slice(5, 7)) - 1;
        const et0 = hargreavesEt0(cfg.tmin_c[month]!, cfg.tmax_c[month]!, extraterrestrialRadiation(cfg.lat_deg, dayOfYear(date)));
        const kc = plot.crop.planting_date
          ? kcForDay(crop, daysBetween(plot.crop.planting_date, date))
          : kcForStage(crop, plot.crop.stage ?? 'mid');
        d = Math.min(agro.taw_mm, d + waterStressKs(d, agro.taw_mm, agro.raw_mm) * kc * et0);
      }
      return { mm: d, provenance: 'estimated' };
    },
  };
}
