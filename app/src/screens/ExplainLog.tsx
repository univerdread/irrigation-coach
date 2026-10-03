import { type FarmInput, type FarmPlan, type Provenance } from '@irrigation-coach/engine';
import { t, type Locale } from '../i18n/i18n';
import { ProvenanceBadge } from '../components/Badges';
import type { Explanation } from '../ai/explain';
import type { LogEntry } from '../storage/logStore';
import { formatDuration } from '../format';

interface Props {
  farm: FarmInput;
  plan: FarmPlan;
  explanation: Explanation | null;
  entries: LogEntry[];
  locale: Locale;
  recompute: (input: FarmInput) => FarmPlan;
  onClear: () => void;
}

function inputRows(farm: FarmInput): { plot: string; name: string; value: string; p: Provenance }[] {
  const rows: { plot: string; name: string; value: string; p: Provenance }[] = [];
  const f = farm.pump.flow;
  if (f) rows.push({ plot: '–', name: 'pump', value: f.kind === 'bucket' ? `${f.litres} L / ${f.seconds} s` : `${f.value} ${f.unit}`, p: f.provenance });
  for (const pl of farm.plots) {
    if (pl.area_m2) rows.push({ plot: pl.id, name: 'area', value: `${pl.area_m2.value} m²`, p: pl.area_m2.provenance });
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

export function ExplainLog({ farm, plan, explanation, entries, locale, recompute, onClear }: Props) {
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

      <div className="card">
        <h2>{t(locale, 'log.inputs')}</h2>
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
        <p className="hint mono">engine {plan.engine_version}</p>
      </div>

      <div className="card">
        <h2>{t(locale, 'log.entries')}</h2>
        {entries.length === 0 && <p className="hint">{t(locale, 'log.empty')}</p>}
        <ul className="log">
          {[...entries].reverse().map((e) => {
            const again = recompute(e.input);
            const same = again.engine_version === e.engine_version && Math.abs(again.total_litres - e.plan.total_litres) < 1e-6 && again.status === e.plan.status;
            return (
              <li key={e.id}>
                <span className="mono">{e.plan.today}</span> · {e.action.kind}
                {e.plan.status === 'pump' ? ` · ${formatDuration(locale, e.plan.total_minutes)}` : ''}
                {e.action.minutes_run !== undefined ? ` · ran ${e.action.minutes_run} min` : ''}
                <span className={same ? 'ok' : 'warn'}> {same ? t(locale, 'log.recompute_ok') : t(locale, 'log.recompute_diff')}</span>
              </li>
            );
          })}
        </ul>
        {entries.length > 0 && (
          <button className="ghost" onClick={onClear}>{t(locale, 'log.clear')}</button>
        )}
      </div>
    </section>
  );
}

