// Today's plan for one farm: per-plot decision, then a shared-pump allocation.
// Deterministic. No AI here: the model only phrases questions and explanations from this output.
import { DEFAULT_RAIN_MODEL, effectiveRain } from './rain';
import { fixtureDeficitSource, type DeficitSource } from './deficit-source';
import { findCrop } from './tables';
import { daysBetween, grossLitres, pumpMinutes, toLpm } from './units';
import { stageForDay } from './fao56/kc';
import { ENGINE_VERSION } from './version';
import type {
  CropStage,
  EssentialInput,
  FarmInput,
  FarmPlan,
  PlotInput,
  PlotPlan,
  Provenance,
  Question,
  QuestionKey,
  Quantity,
  Warning,
} from './types';

export interface PlanOptions {
  deficitSource?: DeficitSource;
}

/** Guardrail thresholds. DEMO ASSUMPTIONS until reviewed locally; they only trigger messages. */
export const GUARDRAILS = {
  steep_slope_pct: 8,
  clay_pct_short_sets: 40,
};

const QUESTION_FOR: Record<EssentialInput, QuestionKey> = {
  area: 'ask_area',
  flow: 'ask_bucket_test',
  efficiency: 'ask_method',
  crop_stage: 'ask_crop_stage',
  soil_awc: 'ask_soil_test',
  deficit: 'ask_moisture_check',
  rain_since: 'ask_rain_since',
};

const ORDER: EssentialInput[] = ['area', 'flow', 'efficiency', 'crop_stage', 'soil_awc', 'deficit', 'rain_since'];

const positive = (q: Quantity | null | undefined): number | null =>
  q && q.value !== null && Number.isFinite(q.value) && q.value > 0 ? q.value : null;
const nonNegative = (q: Quantity | null | undefined): number | null =>
  q && q.value !== null && Number.isFinite(q.value) && q.value >= 0 ? q.value : null;

function resolveStage(plot: PlotInput, today: string): CropStage | null {
  if (!plot.crop) return null;
  const crop = findCrop(plot.crop.crop_id);
  if (!crop) return null;
  if (plot.crop.stage) return plot.crop.stage;
  if (plot.crop.planting_date) return stageForDay(crop, daysBetween(plot.crop.planting_date, today));
  return null;
}

/** The deterministic validator: which essential inputs are unknown or invalid, in question order. */
export function missingInputs(plot: PlotInput, flowLpm: number | null, today: string): EssentialInput[] {
  const eff = positive(plot.efficiency);
  const missing = new Set<EssentialInput>();
  if (positive(plot.area_m2) === null) missing.add('area');
  if (flowLpm === null) missing.add('flow');
  if (eff === null || eff > 1) missing.add('efficiency');
  if (resolveStage(plot, today) === null) missing.add('crop_stage');
  if (positive(plot.soil_awc_mm_per_m) === null) missing.add('soil_awc');
  if (!plot.deficit || !(plot.deficit.mm >= 0)) missing.add('deficit');
  if (nonNegative(plot.rain_since_mm) === null) missing.add('rain_since');
  return ORDER.filter((k) => missing.has(k));
}

function warningsFor(plot: PlotInput): Warning[] {
  const w: Warning[] = [];
  const c = plot.context ?? {};
  if (c.salty_water_reported) w.push({ code: 'salty_water' });
  if (c.clay_pct !== undefined && c.clay_pct >= GUARDRAILS.clay_pct_short_sets) w.push({ code: 'clay_short_sets', params: { clay_pct: c.clay_pct } });
  if (c.slope_pct !== undefined && c.slope_pct >= GUARDRAILS.steep_slope_pct && plot.method === 'furrow')
    w.push({ code: 'steep_slope_furrow', params: { slope_pct: c.slope_pct } });
  if (c.fertilizer_applied_on) w.push({ code: 'fertilizer_logged', params: { date: c.fertilizer_applied_on } });
  if (c.water_scarce) w.push({ code: 'water_scarce_no_expansion' });
  const crop = plot.crop ? findCrop(plot.crop.crop_id) : undefined;
  if (crop?.proxy_for) w.push({ code: 'crop_proxy_parameters', params: { proxy_for: crop.proxy_for } });
  return w;
}

function paused(plot: PlotInput, reason: PlotPlan['reason'], question: Question, warnings: Warning[], extra: Partial<PlotPlan> = {}): PlotPlan {
  return {
    plot_id: plot.id,
    status: 'paused',
    reason,
    question,
    requested_litres: 0,
    allocated_litres: 0,
    unmet_litres: 0,
    minutes: 0,
    warnings,
    assumptions: [],
    ...extra,
  };
}

/** Decide one plot (before the shared-pump allocation). */
export function planPlot(plot: PlotInput, input: FarmInput, flowLpm: number | null, source: DeficitSource): PlotPlan {
  const warnings = warningsFor(plot);
  const missing = missingInputs(plot, flowLpm, input.today);
  if (missing.length > 0) {
    const first = missing[0]!;
    const params = first === 'rain_since' && plot.deficit ? { since: plot.deficit.as_of.slice(0, 10) } : undefined;
    return paused(plot, 'missing_input', { key: QUESTION_FOR[first], plot_id: plot.id, ...(params ? { params } : {}) }, warnings, { missing });
  }

  const crop = findCrop(plot.crop!.crop_id)!;
  const area = plot.area_m2!.value!;
  const eff = plot.efficiency!.value!;
  const zr = positive(plot.root_depth_m) ?? crop.root_depth_m.min;
  const p = positive(plot.p) ?? crop.p;
  const taw = plot.soil_awc_mm_per_m!.value! * zr;
  const trigger = p * taw;
  const assumptions: string[] = [];
  if (!positive(plot.root_depth_m)) assumptions.push(`root depth ${zr} m from crop table (FAO-56 Table 22 minimum)`);

  const advanced = source.advance(plot.deficit!, input.today, plot, { taw_mm: taw, raw_mm: trigger });
  const before = Math.min(taw, Math.max(0, advanced.mm));
  const rain = effectiveRain(plot.rain_since_mm!.value!, before, input.rain_model ?? DEFAULT_RAIN_MODEL);
  const deficit = before - rain;
  const numbers = { taw_mm: taw, trigger_mm: trigger, deficit_before_rain_mm: before, effective_rain_mm: rain, deficit_mm: deficit, efficiency: eff, area_m2: area };

  // A newer soil check that disagrees with the decision pauses minutes. No winner is picked.
  const check = plot.moisture_check;
  const isNewer = check && check.observed_at >= plot.deficit!.as_of;
  const wouldPump = deficit > 0 && (deficit >= trigger || plot.assume_due === true);
  if (isNewer && ((wouldPump && check.band === 'wet') || (!wouldPump && check.band === 'dry'))) {
    // Repeated disagreement (this check plus at least one earlier one in a row) goes to the extension officer.
    const escalate = (plot.consecutive_disagreements ?? 0) >= 1;
    return paused(
      plot,
      escalate ? 'escalate' : 'contradiction',
      { key: escalate ? 'escalate_extension_officer' : 'ask_second_check', plot_id: plot.id },
      warnings,
      numbers,
    );
  }

  if (deficit <= 0) {
    return { plot_id: plot.id, status: 'not_due', reason: 'no_deficit', ...numbers, requested_litres: 0, allocated_litres: 0, unmet_litres: 0, minutes: 0, warnings, assumptions };
  }
  if (deficit < trigger && !plot.assume_due) {
    return { plot_id: plot.id, status: 'not_due', reason: 'below_trigger', ...numbers, requested_litres: 0, allocated_litres: 0, unmet_litres: 0, minutes: 0, warnings, assumptions };
  }
  if (deficit < trigger) assumptions.push('declared due by fixture (assume_due), below its trigger');

  const litres = grossLitres(area, deficit, eff);
  return {
    plot_id: plot.id,
    status: 'due',
    reason: deficit >= trigger ? 'at_or_above_trigger' : 'assumed_due',
    ...numbers,
    requested_litres: litres,
    allocated_litres: litres,
    unmet_litres: 0,
    minutes: pumpMinutes(litres, flowLpm!),
    warnings,
    assumptions,
  };
}

/**
 * Greedy fill of due plots in priority order under an optional daily cap; partial fills allowed.
 * The order is a visible demo order, not agronomic advice.
 */
export function allocate(plans: PlotPlan[], capLitres: number | null, priority: string[] | undefined, flowLpm: number | null): void {
  const order = priority?.length ? [...priority, ...plans.map((p) => p.plot_id).filter((id) => !priority.includes(id))] : plans.map((p) => p.plot_id);
  let remaining = capLitres ?? Infinity;
  for (const id of order) {
    const p = plans.find((x) => x.plot_id === id);
    if (!p || p.status !== 'due') continue;
    const give = Math.min(p.requested_litres, remaining);
    remaining -= give;
    p.allocated_litres = give;
    p.unmet_litres = p.requested_litres - give;
    p.minutes = flowLpm ? pumpMinutes(give, flowLpm) : 0;
  }
}

function provenancesOf(input: FarmInput): Provenance[] {
  const out = new Set<Provenance>();
  const add = (x: { provenance: Provenance } | null | undefined) => x && out.add(x.provenance);
  add(input.pump.flow);
  for (const p of input.plots) {
    [p.area_m2, p.efficiency, p.crop, p.root_depth_m, p.p, p.soil_awc_mm_per_m, p.deficit, p.rain_since_mm, p.moisture_check].forEach(add);
  }
  return [...out].sort();
}

export function planFarm(input: FarmInput, opts: PlanOptions = {}): FarmPlan {
  const source = opts.deficitSource ?? fixtureDeficitSource;
  const flowLpm = toLpm(input.pump.flow);
  const plots = input.plots.map((p) => planPlot(p, input, flowLpm, source));
  const cap = input.cap_litres ?? null;
  allocate(plots, cap, input.priority, flowLpm);

  const total = plots.reduce((s, p) => s + p.allocated_litres, 0);
  const firstQuestion = plots.find((p) => p.status === 'paused')?.question;
  const provenances = provenancesOf(input);
  return {
    engine_version: ENGINE_VERSION,
    deficit_source: source.id,
    today: input.today,
    status: total > 0 ? 'pump' : firstQuestion ? 'paused' : 'no_pump',
    ...(firstQuestion ? { question: firstQuestion } : {}),
    flow_lpm: flowLpm,
    cap_litres: cap,
    plots,
    total_litres: total,
    total_minutes: flowLpm && total > 0 ? pumpMinutes(total, flowLpm) : 0,
    data_quality: { simulated: provenances.includes('simulated'), provenances },
  };
}
