// The daily message for a basic phone. Same engine output as the app, rendered for SMS or USSD.
import type { FarmPlan } from '@irrigation-coach/engine';
import { has, t, type Locale } from './i18n';
import { duration, litres, shortDate } from './format';

const SETUP_KEYS = new Set(['ask_area', 'ask_bucket_test', 'ask_method', 'ask_crop_stage', 'ask_soil_test']);

export function planText(plan: FarmPlan, locale: Locale, channel: 'sms' | 'ussd' = 'sms'): string {
  if (plan.status === 'pump') {
    return t(locale, channel === 'sms' ? 'sms.pump' : 'ussd.pump', { duration: duration(locale, plan.total_minutes), litres: litres(plan.total_litres) });
  }
  if (plan.status === 'no_pump') {
    return plan.plots.every((p) => p.reason === 'no_deficit') ? t(locale, 'sms.no_pump_full') : t(locale, 'sms.no_pump');
  }
  const q = plan.question!;
  if (SETUP_KEYS.has(q.key)) return t(locale, 'sms.needs_agent');
  const since = q.params?.since;
  const key = channel === 'ussd' && has(locale, `ussd.${q.key}`) ? `ussd.${q.key}` : `sms.${q.key}`;
  return t(locale, key, typeof since === 'string' ? { since: shortDate(locale, since) } : {});
}

/** Earliest date the farmer must report rain since (the plots' last update). */
export function rainSince(plan: FarmPlan, fallback: string): string {
  const s = plan.question?.params?.since;
  return typeof s === 'string' ? s : fallback;
}
