// The AI boundary. Mirrors contracts/schemas/ai/*.json. The model teammate implements these
// interfaces (on-device runtime of their choice) and registers them in registry.ts.
// Rule from the build addendum: ship ONE live AI function the phone stack is shown to support.
import type { FarmPlan, MoistureBand, Question } from '@irrigation-coach/engine';
import type { Locale } from '../i18n/i18n';

export interface ExplainRequest {
  plan: FarmPlan;
  locale: Locale;
  /** Display-rounded numbers the text may contain. Anything else is rejected. */
  allowed_numbers: number[];
  max_words?: number;
}

export interface TextResponse {
  text: string;
  model_id: string;
  inference_ms?: number;
}

/** On-device text model: explanations and question phrasing. */
export interface TextModel {
  readonly id: string;
  explain(req: ExplainRequest): Promise<TextResponse>;
  phraseQuestion?(req: { question: Question; locale: Locale }): Promise<TextResponse>;
}

export interface SoilPhotoRequest {
  image: { mime: 'image/jpeg' | 'image/png' | 'image/webp'; width: number; height: number; uri?: string; b64?: string };
  taps: { forms_ball?: boolean; ribbon?: 'none' | 'short' | 'medium' | 'long'; feel?: 'gritty' | 'smooth' | 'neither' };
  soil_prior?: { sand_pct?: number; clay_pct?: number; texture_class?: string };
}

export interface SoilPhotoResponse {
  moisture_band: MoistureBand;
  texture_group?: string | null;
  /** Model score, NOT a calibrated probability. Never shown as a percentage. */
  confidence: number;
  model_id: string;
  model_file_bytes?: number;
  inference_ms?: number;
  mocked: boolean;
}

/** On-device image model: soil photo to moisture band (and texture where the map is unsure). */
export interface SoilPhotoClassifier {
  readonly id: string;
  classify(req: SoilPhotoRequest): Promise<SoilPhotoResponse>;
}
