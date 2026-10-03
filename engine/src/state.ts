// Farm state transitions after the farmer reports something. Pure and shared by every channel
// (smartphone app, USSD, SMS), so a basic phone and a smartphone always agree.
import { planFarm, type PlanOptions } from './plan';
import type { DeficitState, FarmInput, FarmPlan, MoistureBand, PlotInput, PlotPlan } from './types';

export type FarmerAction = { kind: 'done' } | { kind: 'adjusted'; litres_applied: number } | { kind: 'skipped' };

/** New deficit state as of `today`, or null if the plot was paused (nothing reliable to carry forward). */
export function nextDeficitState(_plot: PlotInput, plan: PlotPlan, action: FarmerAction, today: string): DeficitState | null {
  if (plan.status === 'paused' || plan.deficit_mm === undefined) return null;
  let mm = plan.deficit_mm;
  if (action.kind === 'done') mm -= (plan.allocated_litres * (plan.efficiency ?? 0)) / (plan.area_m2 ?? Infinity);
  if (action.kind === 'adjusted') mm -= (action.litres_applied * (plan.efficiency ?? 0)) / (plan.area_m2 ?? Infinity);
  return { mm: Math.max(0, mm), as_of: today, provenance: 'estimated' };
}

/** A new calendar day: move `today` forward; rain since the last update becomes unknown (never zero). */
export function rollToDay(farm: FarmInput, today: string): FarmInput {
  if (farm.today >= today) return farm;
  return { ...farm, today, plots: farm.plots.map((p) => ({ ...p, rain_since_mm: null })) };
}

/** Rain reported since each plot's last update (mm from a straight-sided container), or null = don't know. */
export function withRain(farm: FarmInput, mm: number | null, observedAt: string): FarmInput {
  return {
    ...farm,
    plots: farm.plots.map((p) => ({ ...p, rain_since_mm: mm === null ? null : { value: mm, unit: 'mm', provenance: 'reported', observed_at: observedAt } })),
  };
}

/**
 * The farmer pumped (as advised, or for some minutes) or skipped. Each plot's deficit is carried
 * forward to today; adjusted litres are split across plots in proportion to their allocation.
 */
export function afterAction(farm: FarmInput, plan: FarmPlan, action: FarmerAction): FarmInput {
  const total = plan.total_litres || 1;
  return {
    ...farm,
    plots: farm.plots.map((p) => {
      const pp = plan.plots.find((x) => x.plot_id === p.id);
      if (!pp) return p;
      const a: FarmerAction = action.kind === 'adjusted' ? { kind: 'adjusted', litres_applied: action.litres_applied * (pp.allocated_litres / total) } : action;
      const next = nextDeficitState(p, pp, a, farm.today);
      if (!next) return p;
      const { moisture_check: _c, assume_due: _a, ...rest } = p;
      return { ...rest, deficit: next, rain_since_mm: { value: 0, unit: 'mm', provenance: 'reported' }, consecutive_disagreements: 0 };
    }),
  };
}

/**
 * DEMO ASSUMPTION (docs/DECISIONS.md D25): starting deficit from a feel/photo check when there is no
 * history. wet -> full (0); ok -> halfway to the watering point; dry -> at the watering point.
 */
export function startingDeficitMm(band: MoistureBand, triggerMm: number): number {
  if (band === 'wet') return 0;
  if (band === 'ok') return triggerMm / 2;
  return triggerMm;
}

/**
 * A soil check (feel chart, photo model or sensor colour) on every plot.
 * - No history yet: it sets a labelled starting point.
 * - Answering a disagreement: counts toward "repeated disagreement" (escalation).
 * - Agrees with the engine: the disagreement count resets.
 */
export function withMoistureCheck(
  farm: FarmInput,
  band: MoistureBand,
  source: 'feel_chart' | 'photo_model' | 'sensor',
  observedAt: string,
  opts: PlanOptions & { mocked?: boolean } = {},
): FarmInput {
  const before = planFarm(farm, opts);
  const checked: FarmInput = {
    ...farm,
    plots: farm.plots.map((p) => {
      const pp = before.plots.find((x) => x.plot_id === p.id);
      const check = { band, observed_at: observedAt, provenance: 'reported' as const, source, ...(opts.mocked ? { mocked: true } : {}) };
      if (!p.deficit && pp?.missing?.every((m) => m === 'deficit' || m === 'rain_since')) {
        // Only the history is missing (no rain-since without a start date), so the trigger is known:
        // compute it the same way the planner does.
        const trial = planFarm({ ...farm, plots: [{ ...p, deficit: { mm: 0, as_of: farm.today, provenance: 'estimated' }, rain_since_mm: { value: 0, unit: 'mm', provenance: 'reported' } }] }, opts);
        const trigger = trial.plots[0]!.trigger_mm ?? 0;
        return {
          ...p,
          deficit: { mm: startingDeficitMm(band, trigger), as_of: farm.today, provenance: 'estimated', source: `${source}: ${band}` },
          rain_since_mm: { value: 0, unit: 'mm', provenance: 'reported' },
        };
      }
      const wasDisagreeing = pp?.reason === 'contradiction' || pp?.reason === 'escalate';
      return { ...p, moisture_check: check, consecutive_disagreements: wasDisagreeing ? (p.consecutive_disagreements ?? 0) + 1 : 0 };
    }),
  };
  // If the new check agrees with the engine, clear the count.
  const after = planFarm(checked, opts);
  return {
    ...checked,
    plots: checked.plots.map((p) => {
      const pp = after.plots.find((x) => x.plot_id === p.id);
      return pp && pp.reason !== 'contradiction' && pp.reason !== 'escalate' ? { ...p, consecutive_disagreements: 0 } : p;
    }),
  };
}

/** "The soil is soaked today" (after a long watering or heavy rain): a clean, reported restart. */
export function freshStart(farm: FarmInput): FarmInput {
  return {
    ...farm,
    plots: farm.plots.map((p) => {
      const { moisture_check: _c, ...rest } = p;
      return {
        ...rest,
        deficit: { mm: 0, as_of: farm.today, provenance: 'reported', source: 'farmer: soil soaked today' },
        rain_since_mm: { value: 0, unit: 'mm', provenance: 'reported' },
        consecutive_disagreements: 0,
      };
    }),
  };
}
