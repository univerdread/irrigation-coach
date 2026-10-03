import { useState } from 'react';
import type { FarmPlan } from '@irrigation-coach/engine';
import { t, type Locale } from '../i18n/i18n';
import { headline, plotReason, questionText } from '../ai/templates';
import { displayLitres, formatDuration, formatNumber } from '../format';

interface Props {
  plan: FarmPlan;
  locale: Locale;
  acted: boolean;
  onRain: (mm: number | null) => void;
  onAction: (kind: 'done' | 'adjusted' | 'skipped', minutes?: number) => void;
  onNextDay: () => void;
  spoken: string;
}

export function TodayPlan({ plan, locale, acted, onRain, onAction, onNextDay, spoken }: Props) {
  const [rainMm, setRainMm] = useState('');
  const [ranMinutes, setRanMinutes] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const q = plan.question;

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = locale === 'sw' ? 'sw-KE' : 'en-GB';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <section className="today">
      <div className={`hero hero-${plan.status}`}>
        <p className="hero-date">{plan.today}</p>
        <h1 className="hero-line">{headline(plan, locale)}</h1>
        {plan.status === 'pump' && (
          <p className="hero-sub">{t(locale, 'plan.litres', { litres: formatNumber(locale, displayLitres(plan.total_litres)) })}</p>
        )}
        <button className="ghost play" onClick={speak} title={t(locale, 'plan.voice_fallback')}>
          ▶ {t(locale, 'plan.play')}
        </button>
      </div>

      {q && (
        <div className="card question">
          <p className="question-text">{questionText(q, locale)}</p>
          {q.key === 'ask_rain_since' && (
            <div className="rain">
              <label>
                {t(locale, 'rain.label', { since: String(q.params?.since ?? '') })}
                <input inputMode="decimal" value={rainMm} onChange={(e) => setRainMm(e.target.value)} placeholder="0" />
              </label>
              <div className="row">
                <button onClick={() => rainMm !== '' && onRain(Number(rainMm.replace(',', '.')))} disabled={rainMm === '' || Number.isNaN(Number(rainMm.replace(',', '.')))}>
                  {t(locale, 'rain.save')}
                </button>
                <button className="ghost" onClick={() => onRain(0)}>{t(locale, 'rain.none')}</button>
                <button className="ghost" onClick={() => onRain(null)}>{t(locale, 'rain.unknown')}</button>
              </div>
              <p className="hint">{t(locale, 'rain.hint')}</p>
            </div>
          )}
        </div>
      )}

      {plan.plots.length > 1 && (
        <div className="card">
          <h2>{t(locale, 'plan.per_plot')}</h2>
          {plan.cap_litres !== null && <p className="hint">{t(locale, 'plan.cap', { litres: formatNumber(locale, plan.cap_litres) })}</p>}
          <ul className="plots">
            {plan.plots.map((p) => (
              <li key={p.plot_id} className={`plot plot-${p.status}`}>
                <span className="plot-id">{p.plot_id}</span>
                <span className="plot-min">{p.allocated_litres > 0 ? formatDuration(locale, p.minutes) : '–'}</span>
                <span className="plot-l">{formatNumber(locale, displayLitres(p.allocated_litres))} L</span>
                {p.unmet_litres > 0 && <span className="unmet">{t(locale, 'plan.unmet', { litres: formatNumber(locale, displayLitres(p.unmet_litres)) })}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.plots.length === 1 && plan.plots[0]!.status !== 'paused' && (
        <p className="reason">{plotReason(plan.plots[0]!, locale)}</p>
      )}

      {plan.plots.flatMap((p) => p.warnings).length > 0 && (
        <ul className="warnings">
          {[...new Map(plan.plots.flatMap((p) => p.warnings).map((w) => [w.code, w])).values()].map((w) => (
            <li key={w.code}>{t(locale, `w.${w.code}`, w.params ?? {})}</li>
          ))}
        </ul>
      )}

      {!acted && plan.status === 'pump' && (
        <div className="actions">
          <button className="primary" onClick={() => onAction('done')}>{t(locale, 'action.done')}</button>
          <button className="ghost" onClick={() => setAdjusting((x) => !x)}>{t(locale, 'action.adjusted')}</button>
          <button className="ghost" onClick={() => onAction('skipped')}>{t(locale, 'action.skipped')}</button>
          {adjusting && (
            <div className="row">
              <input inputMode="numeric" value={ranMinutes} onChange={(e) => setRanMinutes(e.target.value)} placeholder="0" />
              <span>{t(locale, 'action.minutes')}</span>
              <button onClick={() => ranMinutes !== '' && onAction('adjusted', Number(ranMinutes))}>{t(locale, 'rain.save')}</button>
            </div>
          )}
        </div>
      )}
      {!acted && plan.status === 'no_pump' && (
        <div className="actions">
          <button className="primary" onClick={() => onAction('skipped')}>{t(locale, 'action.done')}</button>
        </div>
      )}
      {acted && <p className="hint logged">{t(locale, 'action.logged')}</p>}
      <button className="ghost next-day" onClick={onNextDay}>{t(locale, 'action.next_day')} →</button>
    </section>
  );
}
