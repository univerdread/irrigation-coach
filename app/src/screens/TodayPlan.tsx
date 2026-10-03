import { useEffect, useState } from 'react';
import type { FarmPlan, MoistureBand } from '@irrigation-coach/engine';
import { planText } from '@irrigation-coach/channels';
import { t, type Locale } from '../i18n/i18n';
import { plotReason, questionText } from '../ai/templates';
import { displayLitres, displayMinutes, formatDuration, formatNumber, splitHM } from '../format';
import { shortDate } from '../lib/time';
import { elapsedMinutes, type TimerState } from '../lib/timer';

interface Props {
  plan: FarmPlan;
  locale: Locale;
  acted: boolean;
  demo: boolean;
  timer: TimerState | null;
  onRain: (mm: number | null) => void;
  onCheck: (band: MoistureBand) => void;
  onFreshStart: () => void;
  onAction: (kind: 'done' | 'adjusted' | 'skipped', minutes?: number) => void;
  onTimer: (t: TimerState | null) => void;
  onNextDay: () => void;
  onOpenPlot: () => void;
}

const SETUP_KEYS = new Set(['ask_area', 'ask_bucket_test', 'ask_method', 'ask_crop_stage', 'ask_soil_test']);

/** The phone's own SMS app with the message filled in: no internet, any number, the farmer's contacts. */
function smsHref(body: string): string {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return `sms:${ios ? '&' : '?'}body=${encodeURIComponent(body)}`;
}

export function TodayPlan(p: Props) {
  const { plan, locale } = p;
  const [rainMm, setRainMm] = useState('');
  const [ranMinutes, setRanMinutes] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [, setTick] = useState(0);
  const q = plan.question;

  // Re-render the running timer once a second; vibrate once when time is up.
  useEffect(() => {
    if (!p.timer) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [p.timer]);
  const elapsed = p.timer ? elapsedMinutes(p.timer) : 0;
  const remaining = p.timer ? Math.max(0, p.timer.target_minutes - elapsed) : 0;
  const timeUp = !!p.timer && remaining <= 0;
  useEffect(() => {
    if (timeUp && 'vibrate' in navigator) navigator.vibrate([400, 200, 400]);
  }, [timeUp]);

  const shown = displayMinutes(plan.total_minutes);
  const { h, m } = splitHM(shown);
  const spoken = planText(plan, locale, 'ussd');

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = locale === 'sw' ? 'sw-KE' : 'en-GB';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const feelButtons = (
    <div className="stack">
      {(['dry', 'ok', 'wet'] as MoistureBand[]).map((b) => (
        <button key={b} className="choice wide" onClick={() => p.onCheck(b)}>
          <strong>{t(locale, `check.${b}`)}</strong>
          <span className="choice-hint">{t(locale, `check.${b}_hint`)}</span>
        </button>
      ))}
    </div>
  );

  return (
    <section className="today">
      <div className={`hero hero-${plan.status}`}>
        <p className="hero-date">{shortDate(locale, plan.today)}</p>
        {plan.status === 'pump' && (
          <>
            <p className="hero-eyebrow">{t(locale, 'today.run_for')}</p>
            <p className="hero-figure" aria-label={formatDuration(locale, plan.total_minutes)}>
              {/* Kiswahili puts the unit first: "saa 4 na dakika 10". */}
              {h > 0 && <Amount n={h} unit={t(locale, 'unit.h')} unitFirst={locale === 'sw'} />}
              {h > 0 && (m > 0 ? ' ' : null)}
              {(m > 0 || h === 0) && <Amount n={m} unit={t(locale, 'unit.min')} unitFirst={locale === 'sw'} />}
            </p>
            <p className="hero-sub">{t(locale, 'plan.litres', { litres: formatNumber(locale, displayLitres(plan.total_litres)) })}</p>
          </>
        )}
        {plan.status === 'no_pump' && <p className="hero-line">{t(locale, 'plan.no_pump')}</p>}
        {plan.status === 'paused' && <p className="hero-line">{t(locale, 'plan.paused')}</p>}
        <div className="hero-tools">
          <button className="ghost on-dark" onClick={speak} aria-label={t(locale, 'plan.voice_fallback')}>
            🔊 {t(locale, 'plan.play')}
          </button>
          <a className="button ghost on-dark" href={smsHref(planText(plan, locale, 'sms'))}>
            ✉️ {t(locale, 'today.send_sms')}
          </a>
        </div>
      </div>

      {q && (
        <div className="card question">
          <p className="question-text">{questionText(q, locale)}</p>
          {q.key === 'ask_rain_since' && (
            <div className="rain">
              <p className="hint">{t(locale, 'rain.hint')}</p>
              <div className="row">
                <input inputMode="decimal" aria-label={t(locale, 'rain.label', { since: String(q.params?.since ?? '') })} value={rainMm} onChange={(e) => setRainMm(e.target.value)} placeholder="mm" />
                <button onClick={() => rainMm !== '' && p.onRain(Number(rainMm.replace(',', '.')))} disabled={rainMm === '' || Number.isNaN(Number(rainMm.replace(',', '.')))}>
                  {t(locale, 'rain.save')}
                </button>
              </div>
              <div className="row">
                <button className="ghost" onClick={() => p.onRain(0)}>{t(locale, 'rain.none')}</button>
                <button className="ghost" onClick={() => p.onRain(null)}>{t(locale, 'rain.unknown')}</button>
              </div>
            </div>
          )}
          {(q.key === 'ask_moisture_check' || q.key === 'ask_second_check') && (
            <>
              <p className="hint">{t(locale, 'check.how')}</p>
              {feelButtons}
            </>
          )}
          {q.key === 'escalate_extension_officer' && (
            <>
              <p className="hint">{t(locale, 'check.escalate_hint')}</p>
              <button className="ghost" onClick={p.onFreshStart}>{t(locale, 'check.fresh_start')}</button>
            </>
          )}
          {SETUP_KEYS.has(q.key) && <button onClick={p.onOpenPlot}>{t(locale, 'today.open_plot')} →</button>}
        </div>
      )}

      {plan.plots.length > 1 && (
        <div className="card">
          <h2>{t(locale, 'plan.per_plot')}</h2>
          {plan.cap_litres !== null && <p className="hint">{t(locale, 'plan.cap', { litres: formatNumber(locale, plan.cap_litres) })}</p>}
          <ul className="plots">
            {plan.plots.map((pp) => (
              <li key={pp.plot_id} className={`plot plot-${pp.status}`}>
                <span className="plot-id">{pp.plot_id}</span>
                <span className="plot-min">{pp.allocated_litres > 0 ? formatDuration(locale, pp.minutes) : t(locale, `status.${pp.status}`)}</span>
                <span className="plot-l">{formatNumber(locale, displayLitres(pp.allocated_litres))} L</span>
                {pp.unmet_litres > 0 && <span className="unmet">{t(locale, 'plan.unmet', { litres: formatNumber(locale, displayLitres(pp.unmet_litres)) })}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.plots.length === 1 && plan.plots[0]!.status !== 'paused' && <p className="reason">{plotReason(plan.plots[0]!, locale)}</p>}

      {plan.plots.flatMap((x) => x.warnings).length > 0 && (
        <ul className="warnings">
          {[...new Map(plan.plots.flatMap((x) => x.warnings).map((w) => [w.code, w])).values()].map((w) => (
            <li key={w.code}>{t(locale, `w.${w.code}`, w.params ?? {})}</li>
          ))}
        </ul>
      )}

      {!p.acted && plan.status === 'pump' && (
        <div className="card timer">
          {!p.timer ? (
            <button className="primary" onClick={() => p.onTimer({ started_at: Date.now(), target_minutes: shown, for_date: plan.today })}>
              ⏱ {t(locale, 'timer.start')}
            </button>
          ) : (
            <>
              <p className={timeUp ? 'timer-clock up' : 'timer-clock'} aria-live="polite">
                {timeUp ? t(locale, 'timer.up') : t(locale, 'timer.left', { time: clock(remaining) })}
              </p>
              <div className="timer-bar" aria-hidden="true">
                <div style={{ width: `${Math.min(100, (elapsed / p.timer.target_minutes) * 100)}%` }} />
              </div>
              <button
                className="primary"
                onClick={() => {
                  const ran = Math.round(elapsed);
                  p.onTimer(null);
                  if (timeUp) p.onAction('done');
                  else p.onAction('adjusted', ran);
                }}
              >
                ■ {timeUp ? t(locale, 'timer.done') : t(locale, 'timer.stop_early', { minutes: Math.round(elapsed) })}
              </button>
            </>
          )}
          {!p.timer && (
            <div className="row wrap">
              <button className="ghost" onClick={() => p.onAction('done')}>✓ {t(locale, 'action.done')}</button>
              <button className="ghost" onClick={() => setAdjusting((x) => !x)}>{t(locale, 'action.adjusted')}</button>
              <button className="ghost" onClick={() => p.onAction('skipped')}>{t(locale, 'action.skipped')}</button>
            </div>
          )}
          {adjusting && !p.timer && (
            <div className="row">
              <input inputMode="numeric" value={ranMinutes} onChange={(e) => setRanMinutes(e.target.value)} placeholder="0" aria-label={t(locale, 'action.minutes')} />
              <span>{t(locale, 'action.minutes')}</span>
              <button onClick={() => ranMinutes !== '' && p.onAction('adjusted', Number(ranMinutes))}>{t(locale, 'rain.save')}</button>
            </div>
          )}
        </div>
      )}
      {!p.acted && plan.status === 'no_pump' && (
        <button className="primary" onClick={() => p.onAction('skipped')}>✓ {t(locale, 'today.ok_no_pump')}</button>
      )}
      {p.acted && <p className="logged">✓ {t(locale, 'action.logged')}</p>}
      {p.demo && (
        <button className="ghost next-day" onClick={p.onNextDay}>
          {t(locale, 'action.next_day')} →
        </button>
      )}
    </section>
  );
}

function clock(minutes: number): string {
  const total = Math.ceil(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function Amount({ n, unit, unitFirst }: { n: number; unit: string; unitFirst: boolean }) {
  return unitFirst ? (
    <span className="amount">
      <span className="unit">{unit}</span> {n}
    </span>
  ) : (
    <span className="amount">
      {n}
      <span className="unit">{unit}</span>
    </span>
  );
}
