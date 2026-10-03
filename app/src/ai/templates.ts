// Deterministic text. Works when no model is loaded, so the app always works.
import type { FarmPlan, PlotPlan, Question } from '@irrigation-coach/engine';
import { t, type Locale } from '../i18n/i18n';
import { displayLitres, displayMinutes, displayMm, formatDuration, formatNumber, splitHM } from '../format';

export function headline(plan: FarmPlan, locale: Locale): string {
  if (plan.status === 'pump') return t(locale, 'plan.pump', { duration: formatDuration(locale, plan.total_minutes) });
  if (plan.status === 'paused') return t(locale, 'plan.paused');
  return t(locale, 'plan.no_pump');
}

export function questionText(q: Question, locale: Locale): string {
  return t(locale, `q.${q.key}`, q.params ?? {});
}

export function plotReason(p: PlotPlan, locale: Locale): string {
  const parts = [
    t(locale, `reason.${p.reason}`, {
      deficit: displayMm(p.deficit_mm ?? 0),
      trigger: displayMm(p.trigger_mm ?? 0),
    }),
  ];
  if ((p.effective_rain_mm ?? 0) > 0) parts.push(t(locale, 'reason.rain_counted', { rain: displayMm(p.effective_rain_mm!) }));
  return parts.join(' ');
}

/** Template explanation of the whole plan. */
export function explainTemplate(plan: FarmPlan, locale: Locale): string {
  const lines = [headline(plan, locale) + '.'];
  if (plan.status === 'paused' && plan.question) lines.push(questionText(plan.question, locale));
  for (const p of plan.plots) {
    if (p.status === 'paused') continue;
    const prefix = plan.plots.length > 1 ? `${p.plot_id}: ` : '';
    lines.push(prefix + plotReason(p, locale));
  }
  if (plan.status === 'pump') lines.push(t(locale, 'plan.litres', { litres: formatNumber(locale, displayLitres(plan.total_litres)) }) + '.');
  return lines.join(' ');
}

/** Every number the explanation is allowed to contain, as displayed. */
export function allowedNumbers(plan: FarmPlan): number[] {
  const out = new Set<number>();
  const addDuration = (min: number) => {
    const d = displayMinutes(min);
    const { h, m } = splitHM(d);
    [d, h, m].forEach((x) => out.add(x));
  };
  addDuration(plan.total_minutes);
  out.add(displayLitres(plan.total_litres));
  out.add(Math.round(plan.total_litres / 1000)); // m3
  if (plan.cap_litres !== null) out.add(displayLitres(plan.cap_litres));
  for (const p of plan.plots) {
    addDuration(p.minutes);
    [p.allocated_litres, p.unmet_litres, p.requested_litres].forEach((l) => out.add(displayLitres(l)));
    [p.deficit_mm, p.trigger_mm, p.effective_rain_mm, p.taw_mm].forEach((mm) => mm !== undefined && out.add(displayMm(mm)));
    if (p.efficiency !== undefined) out.add(Math.round(p.efficiency * 100));
  }
  if (plan.question?.key === 'ask_bucket_test') out.add(20); // "a 20-litre bucket"
  const since = plan.question?.params?.since;
  for (const d of [plan.today, typeof since === 'string' ? since : undefined]) {
    if (d) d.split('-').map(Number).forEach((x) => out.add(x));
  }
  return [...out];
}
