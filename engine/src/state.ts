// Carry the deficit forward after the farmer reports what they did. Self-reported.
import type { DeficitState, PlotInput, PlotPlan } from './types';

export type FarmerAction = { kind: 'done' } | { kind: 'adjusted'; litres_applied: number } | { kind: 'skipped' };

/** New deficit state as of `today`, or null if the plot was paused (nothing reliable to carry forward). */
export function nextDeficitState(_plot: PlotInput, plan: PlotPlan, action: FarmerAction, today: string): DeficitState | null {
  if (plan.status === 'paused' || plan.deficit_mm === undefined) return null;
  let mm = plan.deficit_mm;
  if (action.kind === 'done') mm -= ((plan.allocated_litres * (plan.efficiency ?? 0)) / (plan.area_m2 ?? Infinity));
  if (action.kind === 'adjusted') mm -= (action.litres_applied * (plan.efficiency ?? 0)) / (plan.area_m2 ?? Infinity);
  return { mm: Math.max(0, mm), as_of: today, provenance: 'estimated' };
}
