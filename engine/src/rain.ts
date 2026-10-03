import type { EffectiveRainModel } from './types';

/**
 * Placeholder until validated locally (idea doc, build addendum). Shape follows CROPWAT's
 * fixed-percentage option; the 1 mm floor follows FAO-56 ch. 8 ("daily precipitation in
 * amounts less than about 0.2 ETo is normally entirely evaporated"), at ETo of about 5 mm/day.
 */
export const DEFAULT_RAIN_MODEL: EffectiveRainModel = {
  fraction: 0.8,
  ignore_below_mm: 1,
  provenance: 'assumed',
  source: 'placeholder: 80% of reported rain, showers under 1 mm ignored; validate locally',
};

/** Rain that enters the root zone. Reported rain is stored separately; this is capped at the current deficit. */
export function effectiveRain(reportedMm: number, deficitMm: number, model: EffectiveRainModel = DEFAULT_RAIN_MODEL): number {
  if (reportedMm <= 0 || reportedMm < model.ignore_below_mm) return 0;
  return Math.min(Math.max(deficitMm, 0), reportedMm * model.fraction);
}
