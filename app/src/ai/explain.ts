import type { FarmPlan } from '@irrigation-coach/engine';
import type { Locale } from '../i18n/i18n';
import { verifyNumbers, type GuardResult } from './guard';
import { allowedNumbers, explainTemplate } from './templates';
import type { TextModel } from './types';

export interface Explanation {
  text: string;
  producer: 'template' | 'model';
  model_id?: string;
  /** Why model text was rejected, if it was. */
  rejected?: GuardResult | { ok: false; reason: 'model_error'; message: string };
}

/** Model explanation if a model is loaded and its numbers check out; otherwise the template. */
export async function explain(plan: FarmPlan, locale: Locale, model: TextModel | null): Promise<Explanation> {
  const template = explainTemplate(plan, locale);
  if (!model) return { text: template, producer: 'template' };
  const allowed = allowedNumbers(plan);
  try {
    const res = await model.explain({ plan, locale, allowed_numbers: allowed, max_words: 60 });
    const check = verifyNumbers(res.text, allowed);
    if (!check.ok) return { text: template, producer: 'template', rejected: check };
    return { text: res.text, producer: 'model', model_id: res.model_id };
  } catch (e) {
    return { text: template, producer: 'template', rejected: { ok: false, reason: 'model_error', message: String(e) } };
  }
}
