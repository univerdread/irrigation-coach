// Public engine types. They mirror contracts/schemas/*.json (snake_case at the boundary)
// so the same JSON flows between app, engine, log and the on-device explainer.

export type Provenance = 'measured' | 'reported' | 'mapped' | 'estimated' | 'simulated' | 'table' | 'assumed';

/** A number with unit and provenance. value null = unknown, never zero. */
export interface Quantity {
  value: number | null;
  unit: string;
  provenance: Provenance;
  source?: string;
  observed_at?: string;
}

export type FlowInput =
  | { kind: 'rate'; value: number | null; unit: 'L/min' | 'L/h' | 'm3/h'; provenance: Provenance; source?: string; observed_at?: string }
  | { kind: 'bucket'; litres: number; seconds: number; provenance: Provenance; source?: string; observed_at?: string };

export type CropStage = 'ini' | 'dev' | 'mid' | 'late';
export type MethodId = 'furrow' | 'sprinkler' | 'drip';
export type MoistureBand = 'dry' | 'ok' | 'wet';
export type EssentialInput = 'area' | 'flow' | 'efficiency' | 'crop_stage' | 'soil_awc' | 'deficit' | 'rain_since';
export type QuestionKey =
  | 'ask_area'
  | 'ask_bucket_test'
  | 'ask_method'
  | 'ask_crop_stage'
  | 'ask_soil_test'
  | 'ask_moisture_check'
  | 'ask_rain_since'
  | 'ask_second_check'
  | 'escalate_extension_officer';

export interface DeficitState {
  /** Root-zone depletion below field capacity, mm. */
  mm: number;
  /** Date (or datetime) the depletion refers to. */
  as_of: string;
  provenance: Provenance;
  source?: string;
}

export interface MoistureCheck {
  band: MoistureBand;
  observed_at: string;
  provenance: Provenance;
  source: 'photo_model' | 'feel_chart' | 'sensor';
  /** true if a photo result did not come from a live model. */
  mocked?: boolean;
}

export interface PlotContext {
  slope_pct?: number;
  clay_pct?: number;
  salty_water_reported?: boolean;
  fertilizer_applied_on?: string;
  water_scarce?: boolean;
}

export interface PlotInput {
  id: string;
  label?: string;
  area_m2: Quantity | null;
  method?: MethodId;
  /** Field application efficiency, fraction (0, 1]. Applies to pumped water only. */
  efficiency: Quantity | null;
  crop: { crop_id: string; stage: CropStage | null; planting_date?: string; provenance: Provenance } | null;
  root_depth_m?: Quantity;
  p?: Quantity;
  soil_awc_mm_per_m: Quantity | null;
  deficit: DeficitState | null;
  /** Rain reported since deficit.as_of, mm. null = unknown. */
  rain_since_mm: Quantity | null;
  moisture_check?: MoistureCheck;
  consecutive_disagreements?: number;
  /** FIXTURE ONLY: bypass the trigger. Recorded in the plan's assumptions. */
  assume_due?: boolean;
  context?: PlotContext;
}

export interface EffectiveRainModel {
  fraction: number;
  ignore_below_mm: number;
  provenance?: Provenance;
  source?: string;
}

export interface FarmInput {
  today: string;
  pump: { flow: FlowInput | null };
  cap_litres?: number | null;
  priority?: string[];
  rain_model?: EffectiveRainModel;
  plots: PlotInput[];
}

export interface Question {
  key: QuestionKey;
  plot_id?: string;
  params?: Record<string, string | number>;
}

export type WarningCode =
  | 'salty_water'
  | 'clay_short_sets'
  | 'steep_slope_furrow'
  | 'fertilizer_logged'
  | 'water_scarce_no_expansion'
  | 'crop_proxy_parameters'
  | 'stage_lengths_placeholder';

export interface Warning {
  code: WarningCode;
  params?: Record<string, string | number>;
}

export type PlotStatus = 'due' | 'not_due' | 'paused';
export type PlotReason = 'at_or_above_trigger' | 'below_trigger' | 'no_deficit' | 'missing_input' | 'contradiction' | 'escalate' | 'assumed_due';

export interface PlotPlan {
  plot_id: string;
  status: PlotStatus;
  reason: PlotReason;
  question?: Question;
  missing?: EssentialInput[];
  taw_mm?: number;
  trigger_mm?: number;
  deficit_before_rain_mm?: number;
  effective_rain_mm?: number;
  deficit_mm?: number;
  efficiency?: number;
  area_m2?: number;
  requested_litres: number;
  allocated_litres: number;
  unmet_litres: number;
  minutes: number;
  warnings: Warning[];
  assumptions: string[];
}

export interface FarmPlan {
  engine_version: string;
  /** Which DeficitSource produced today's deficit; needed to recompute a logged plan. */
  deficit_source: string;
  today: string;
  status: 'pump' | 'no_pump' | 'paused';
  question?: Question;
  flow_lpm: number | null;
  cap_litres: number | null;
  plots: PlotPlan[];
  total_litres: number;
  total_minutes: number;
  data_quality: { simulated: boolean; provenances: Provenance[] };
}

export interface CropParams {
  id: string;
  names: Record<string, string>;
  kc: { ini: number; mid: number; end: number };
  stage_days: { ini: number; dev: number; mid: number; late: number };
  root_depth_m: { min: number; max: number };
  p: number;
  proxy_for?: string;
  sources: Record<string, string>;
}

export interface MethodParams {
  id: MethodId;
  names: Record<string, string>;
  efficiency: number;
  source: string;
}
