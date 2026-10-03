import { useState } from 'react';
import type { FarmInput, FarmPlan, Provenance } from '@irrigation-coach/engine';
import { t, type Locale } from '../i18n/i18n';
import { ProvenanceBadge } from '../components/Badges';
import { StatTile } from '../components/StatTile';
import type { Explanation } from '../ai/explain';
import type { LogEntry } from '../storage/logStore';
import { formatDuration, formatNumber } from '../format';
import { shortDate } from '../lib/time';

interface Props {
  farm: FarmInput;
  plan: FarmPlan;
  explanation: Explanation | null;
  entries: LogEntry[];
  locale: Locale;
  demo: boolean;
  recompute: (input: FarmInput) => FarmPlan;
  onClear: () => void;
  onResetPlot: () => void;
  onSwitchMode: () => void;
}

function inputRows(farm: FarmInput): { plot: string; name: string; value: string; p: Provenance }[] {
  const rows: { plot: string; name: string; value: string; p: Provenance }[] = [];
  const f = farm.pump.flow;
  if (f) rows.push({ plot: '–', name: 'pump', value: f.kind === 'bucket' ? `${f.litres} L / ${f.seconds} s` : `${f.value} ${f.unit}`, p: f.provenance });
  for (const pl of farm.plots) {
    if (pl.area_m2) rows.push({ plot: pl.id, name: 'area', value: `${Math.round(pl.area_m2.value ?? 0)} m²`, p: pl.area_m2.provenance });
    if (pl.efficiency) rows.push({ plot: pl.id, name: 'efficiency', value: `${pl.efficiency.value}`, p: pl.efficiency.provenance });
    if (pl.crop) rows.push({ plot: pl.id, name: 'crop', value: `${pl.crop.crop_id} / ${pl.crop.stage ?? '?'}`, p: pl.crop.provenance });
    if (pl.soil_awc_mm_per_m) rows.push({ plot: pl.id, name: 'soil water', value: `${Math.round(pl.soil_awc_mm_per_m.value ?? 0)} mm/m`, p: pl.soil_awc_mm_per_m.provenance });
    if (pl.deficit) rows.push({ plot: pl.id, name: 'deficit', value: `${Math.round(pl.deficit.mm * 10) / 10} mm @ ${pl.deficit.as_of.slice(0, 10)}`, p: pl.deficit.provenance });
    rows.push({ plot: pl.id, name: 'rain since', value: pl.rain_since_mm?.value == null ? '?' : `${pl.rain_since_mm.value} mm`, p: pl.rain_since_mm?.provenance ?? 'reported' });
    if (pl.moisture_check)
      rows.push({ plot: pl.id, name: 'soil check', value: `${pl.moisture_check.band}${pl.moisture_check.mocked ? ' (mock)' : ''}`, p: pl.moisture_check.provenance });
  }
  return rows;
}

/** Self-reported totals: what the farmer said they did. Not independent evidence until spot-checked. */
function seasonSoFar(entries: LogEntry[]) {
  const days = new Set(entries.map((e) => e.plan.today)).size;
  let pumped = 0;
  let minutes = 0;
  let litres = 0;
  for (const e of entries) {
    if (e.action.kind === 'done') {
      pumped++;
      minutes += e.plan.total_minutes;
      litres += e.plan.total_litres;
    } else if (e.action.kind === 'adjusted') {
      pumped++;
      minutes += e.action.minutes_run ?? 0;
      litres += e.action.litres_applied ?? 0;
    }
  }
  return { days, pumped, minutes, litres };
}

function download(entries: LogEntry[], farm: FarmInput) {
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), farm, log: entries }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pump-coach-log-${farm.today}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ExplainLog({ farm, plan, explanation, entries, locale, demo, recompute, onClear, onResetPlot, onSwitchMode }: Props) {
  const s = seasonSoFar(entries);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <section className="explain-log">
      <div className="card">
        <h2>{t(locale, 'log.explanation')}</h2>
        <p className="explanation">{explanation?.text ?? '…'}</p>
        {explanation && (
          <p className="hint">
            {explanation.producer === 'model' ? t(locale, 'log.producer_model') : t(locale, 'log.producer_template')}
            {explanation.model_id ? ` · ${explanation.model_id}` : ''}
          </p>
        )}
      </div>

      <div className="stats">
        <StatTile label={t(locale, 'log.days')} value={String(s.days)} />
        <StatTile label={t(locale, 'log.times_pumped')} value={String(s.pumped)} />
        <StatTile label={t(locale, 'season.hours')} value={`${formatNumber(locale, Math.round((s.minutes / 60) * 10) / 10)} h`} />
        <StatTile label={t(locale, 'season.water')} value={`${formatNumber(locale, Math.round(s.litres / 1000))} m³`} />
      </div>
      <p className="hint">{t(locale, 'log.self_reported')}</p>

      <div className="card">
        <h2>{t(locale, 'log.entries')}</h2>
        {entries.length === 0 && <p className="hint">{t(locale, 'log.empty')}</p>}
        <ul className="log">
          {[...entries].reverse().map((e) => {
            const again = recompute(e.input);
            const same = again.engine_version === e.engine_version && Math.abs(again.total_litres - e.plan.total_litres) < 1e-6 && again.status === e.plan.status;
            return (
              <li key={e.id}>
                <span className="mono">{shortDate(locale, e.plan.today)}</span> · {t(locale, `logkind.${e.action.kind}`)}
                {e.plan.status === 'pump' ? ` · ${formatDuration(locale, e.plan.total_minutes)}` : ''}
                {e.action.minutes_run !== undefined ? ` · ${t(locale, 'log.ran', { minutes: e.action.minutes_run })}` : ''}
                <span className={same ? 'ok' : 'warn'}> · {same ? t(locale, 'log.recompute_ok') : t(locale, 'log.recompute_diff')}</span>
              </li>
            );
          })}
        </ul>
        <div className="row wrap">
          {entries.length > 0 && <button className="ghost" onClick={() => download(entries, farm)}>⬇ {t(locale, 'log.export')}</button>}
          {entries.length > 0 && <button className="ghost" onClick={onClear}>{t(locale, 'log.clear')}</button>}
        </div>
      </div>

      <details className="card">
        <summary>{t(locale, 'log.inputs')}</summary>
        <table className="inputs">
          <tbody>
            {inputRows(farm).map((r, i) => (
              <tr key={i}>
                <td className="mono">{r.plot}</td>
                <td>{r.name}</td>
                <td className="mono">{r.value}</td>
                <td><ProvenanceBadge p={r.p} locale={locale} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint mono">engine {plan.engine_version} · {plan.deficit_source}</p>
      </details>

      <details className="card">
        <summary>{t(locale, 'about.title')}</summary>
        <p>{t(locale, 'about.body')}</p>
        <p className="hint">{t(locale, 'about.data')}</p>
        <p className="hint">{t(locale, 'about.privacy')}</p>
        <div className="row wrap">
          <button className="ghost" onClick={onSwitchMode}>{demo ? t(locale, 'demo.my_plot') : t(locale, 'about.try_demo')}</button>
          {!demo &&
            (confirmReset ? (
              <button className="danger" onClick={onResetPlot}>{t(locale, 'about.reset_confirm')}</button>
            ) : (
              <button className="ghost" onClick={() => setConfirmReset(true)}>{t(locale, 'about.reset')}</button>
            ))}
        </div>
      </details>
    </section>
  );
}
