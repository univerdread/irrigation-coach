import { useState } from 'react';
import {
  CROPS,
  METHODS,
  findCrop,
  lookupAreaPack,
  omPctFromOcGPerKg,
  ribbonTextureClass,
  saxtonRawls,
  updateTextureWithRibbon,
  usdaTextureClass,
  type AreaPack,
  type TextureEstimate,
  TEXTURE_CENTROIDS,
  toLpm,
  type CropStage,
  type FarmInput,
  type MethodId,
  type PlotInput,
  type RibbonTaps,
} from '@irrigation-coach/engine';
import { t, type Locale } from '../i18n/i18n';
import { ProvenanceBadge } from '../components/Badges';
import { displayMm, formatNumber } from '../format';
import { DEMO_AREA } from '../demo/area';

const M2_PER_ACRE = 4046.86;
/** DEMO ASSUMPTION when no area pack is loaded: topsoil organic matter for the ribbon-only path. */
const DEFAULT_OM_PCT = 1.5;

interface Props {
  farm: FarmInput;
  locale: Locale;
  onChange: (farm: FarmInput) => void;
}

export function PlotInputs({ farm, locale, onChange }: Props) {
  const [idx, setIdx] = useState(0);
  const [acres, setAcres] = useState(false);
  const [taps, setTaps] = useState<RibbonTaps>({});
  const [prior, setPrior] = useState<(TextureEstimate & { om_pct: number }) | null>(null);
  const plot = farm.plots[Math.min(idx, farm.plots.length - 1)]!;
  const crop = plot.crop ? findCrop(plot.crop.crop_id) : undefined;

  const setPlot = (patch: Partial<PlotInput>) =>
    onChange({ ...farm, plots: farm.plots.map((p) => (p.id === plot.id ? { ...p, ...patch } : p)) });

  const area = plot.area_m2?.value ?? null;
  const flow = farm.pump.flow;
  const lpm = toLpm(flow);
  const bucket = flow?.kind === 'bucket' ? flow : { litres: 20, seconds: 0 };
  const zr = plot.root_depth_m?.value ?? crop?.root_depth_m.min ?? 0;
  const trigger = (plot.p?.value ?? crop?.p ?? 0) * (plot.soil_awc_mm_per_m?.value ?? 0) * zr;
  const ribbonClass = ribbonTextureClass(taps);

  // Step 1: the soil map gives a prior with its uncertainty (idea doc: "the map is a prior, not a measurement").
  const useSoilMap = async () => {
    const pack = (await import('../demo/packs/ke-kajiado-kimana-demo.json')).default as unknown as AreaPack;
    const v = lookupAreaPack(pack, DEMO_AREA.lat, DEMO_AREA.lon)?.values;
    if (!v || v.sand_pct == null || v.clay_pct == null || v.oc_g_per_kg == null) return;
    const est = { sand_pct: v.sand_pct, sand_sd: v.sand_sd ?? 15, clay_pct: v.clay_pct, clay_sd: v.clay_sd ?? 10, om_pct: omPctFromOcGPerKg(v.oc_g_per_kg) };
    setPrior(est);
    const r = saxtonRawls(est);
    setPlot({
      soil_awc_mm_per_m: { value: r.awc_mm_per_m, unit: 'mm/m', provenance: 'mapped', source: `iSDAsoil at ${DEMO_AREA.lat}, ${DEMO_AREA.lon}: ${usdaTextureClass(est.sand_pct, est.clay_pct)}; Saxton & Rawls 2006` },
      context: { ...plot.context, clay_pct: est.clay_pct, ...(v.slope_pct != null ? { slope_pct: v.slope_pct } : {}) },
    });
  };

  // Step 2: the ribbon test updates the prior, weighted by the map's uncertainty at that spot.
  const applyRibbon = () => {
    if (!ribbonClass) return;
    const c = TEXTURE_CENTROIDS[ribbonClass];
    const fused = prior ? updateTextureWithRibbon(prior, ribbonClass) : { ...c, sand_sd: 0, clay_sd: 0 };
    const om = prior?.om_pct ?? DEFAULT_OM_PCT;
    const r = saxtonRawls({ sand_pct: fused.sand_pct, clay_pct: fused.clay_pct, om_pct: om });
    setPlot({
      soil_awc_mm_per_m: {
        value: r.awc_mm_per_m,
        unit: 'mm/m',
        provenance: 'estimated',
        source: prior
          ? `map prior + ribbon (${ribbonClass}) -> sand ${fused.sand_pct.toFixed(0)}, clay ${fused.clay_pct.toFixed(0)}; Saxton & Rawls 2006`
          : `ribbon test: ${ribbonClass}; Saxton & Rawls 2006, OM ${DEFAULT_OM_PCT}% assumed`,
      },
      context: { ...plot.context, clay_pct: fused.clay_pct },
    });
  };

  return (
    <section className="plot-inputs">
      <p className="hint">{t(locale, 'plot.weather_note')}</p>
      {farm.plots.length > 1 && (
        <div className="row tabs-small">
          {farm.plots.map((p, i) => (
            <button key={p.id} className={i === idx ? 'chip on' : 'chip'} onClick={() => setIdx(i)}>
              {p.id} {p.label ?? ''}
            </button>
          ))}
        </div>
      )}

      <div className="card field">
        <label>
          {t(locale, 'plot.area')} <ProvenanceBadge p={plot.area_m2?.provenance ?? 'reported'} locale={locale} />
          <div className="row">
            <input
              inputMode="decimal"
              value={area === null ? '' : acres ? +(area / M2_PER_ACRE).toFixed(3) : area}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value) * (acres ? M2_PER_ACRE : 1);
                setPlot({ area_m2: { value: v, unit: 'm2', provenance: 'reported' } });
              }}
            />
            <button className="chip" onClick={() => setAcres((a) => !a)}>
              {acres ? t(locale, 'plot.area_unit_acre') : t(locale, 'plot.area_unit_m2')}
            </button>
          </div>
        </label>
      </div>

      <div className="card field">
        <label>
          {t(locale, 'plot.crop')}
          <select
            value={plot.crop?.crop_id ?? ''}
            onChange={(e) => setPlot({ crop: { crop_id: e.target.value, stage: plot.crop?.stage ?? null, provenance: 'reported' } })}
          >
            <option value="" disabled>–</option>
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>{c.names[locale] ?? c.names.en}</option>
            ))}
          </select>
        </label>
        <label>
          {t(locale, 'plot.stage')}
          <div className="row wrap">
            {(['ini', 'dev', 'mid', 'late'] as CropStage[]).map((s) => (
              <button
                key={s}
                className={plot.crop?.stage === s ? 'chip on' : 'chip'}
                onClick={() => plot.crop && setPlot({ crop: { ...plot.crop, stage: s, provenance: 'reported' } })}
              >
                {t(locale, `stage.${s}`)}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="card field">
        <label>
          {t(locale, 'plot.method')} <ProvenanceBadge p={plot.efficiency?.provenance ?? 'table'} locale={locale} />
          <div className="row wrap">
            {METHODS.map((m) => (
              <button
                key={m.id}
                className={plot.method === m.id ? 'chip on' : 'chip'}
                onClick={() =>
                  setPlot({ method: m.id as MethodId, efficiency: { value: m.efficiency, unit: 'fraction', provenance: 'table', source: `methods.json ${m.id}` } })
                }
              >
                {m.names[locale] ?? m.names.en} · {Math.round(m.efficiency * 100)}%
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="card field">
        <label>
          {t(locale, 'plot.soil_awc')} <ProvenanceBadge p={plot.soil_awc_mm_per_m?.provenance ?? 'reported'} locale={locale} />
          <input
            inputMode="decimal"
            value={plot.soil_awc_mm_per_m?.value === null || plot.soil_awc_mm_per_m === null ? '' : displayMm(plot.soil_awc_mm_per_m.value)}
            onChange={(e) =>
              setPlot({ soil_awc_mm_per_m: { value: e.target.value === '' ? null : Number(e.target.value), unit: 'mm/m', provenance: 'reported' } })
            }
          />
        </label>
        <button className="ghost" onClick={() => void useSoilMap()}>{t(locale, 'plot.soil_map')}</button>
        {prior && (
          <p className="hint mono">
            {usdaTextureClass(prior.sand_pct, prior.clay_pct)} · sand {prior.sand_pct}±{prior.sand_sd} · clay {prior.clay_pct}±{prior.clay_sd} · OM {prior.om_pct.toFixed(1)}%
          </p>
        )}
        <details>
          <summary>{t(locale, 'plot.ribbon')}</summary>
          <p className="hint">{t(locale, 'plot.forms_ball')}</p>
          <div className="row">
            <button className={taps.forms_ball === true ? 'chip on' : 'chip'} onClick={() => setTaps({ forms_ball: true })}>{t(locale, 'yes')}</button>
            <button className={taps.forms_ball === false ? 'chip on' : 'chip'} onClick={() => setTaps({ forms_ball: false })}>{t(locale, 'no')}</button>
          </div>
          {taps.forms_ball && (
            <>
              <p className="hint">{t(locale, 'plot.ribbon_len')}</p>
              <div className="row wrap">
                {(['none', 'short', 'medium', 'long'] as const).map((r) => (
                  <button key={r} className={taps.ribbon === r ? 'chip on' : 'chip'} onClick={() => setTaps({ forms_ball: true, ribbon: r })}>
                    {r === 'none' ? '0' : r === 'short' ? '< 2.5 cm' : r === 'medium' ? '2.5–5 cm' : '> 5 cm'}
                  </button>
                ))}
              </div>
            </>
          )}
          {taps.ribbon && taps.ribbon !== 'none' && (
            <>
              <p className="hint">{t(locale, 'plot.feel')}</p>
              <div className="row wrap">
                {(['gritty', 'smooth', 'neither'] as const).map((f) => (
                  <button key={f} className={taps.feel === f ? 'chip on' : 'chip'} onClick={() => setTaps({ ...taps, feel: f })}>
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}
          {ribbonClass && (
            <div className="row">
              <strong>{ribbonClass}</strong>
              <button onClick={applyRibbon}>→ {t(locale, 'plot.soil_awc')}</button>
            </div>
          )}
        </details>
      </div>

      <div className="card field">
        <label>
          {t(locale, 'plot.pump')} <ProvenanceBadge p={flow?.provenance ?? 'measured'} locale={locale} />
          <div className="row">
            <input
              inputMode="decimal"
              aria-label={t(locale, 'plot.bucket_litres')}
              value={bucket.litres}
              onChange={(e) => onChange({ ...farm, pump: { flow: { kind: 'bucket', litres: Number(e.target.value), seconds: bucket.seconds, provenance: 'measured' } } })}
            />
            <span>L in</span>
            <input
              inputMode="decimal"
              aria-label={t(locale, 'plot.bucket_seconds')}
              value={bucket.seconds || ''}
              onChange={(e) => onChange({ ...farm, pump: { flow: { kind: 'bucket', litres: bucket.litres, seconds: Number(e.target.value), provenance: 'measured' } } })}
            />
            <span>s</span>
          </div>
        </label>
        {lpm !== null && <p className="hint">{t(locale, 'plot.flow', { lpm: formatNumber(locale, Math.round(lpm * 10) / 10) })}</p>}
      </div>

      <div className="card field">
        <label>
          {t(locale, 'plot.deficit')} <ProvenanceBadge p={plot.deficit?.provenance ?? 'simulated'} locale={locale} />
          <input
            type="range"
            min={0}
            max={Math.max(10, Math.round((plot.soil_awc_mm_per_m?.value ?? 100) * zr))}
            value={plot.deficit?.mm ?? 0}
            onChange={(e) => setPlot({ deficit: { mm: Number(e.target.value), as_of: farm.today, provenance: 'simulated' } })}
          />
          <span className="mono">{displayMm(plot.deficit?.mm ?? 0)} mm</span>
        </label>
        {trigger > 0 && <p className="hint">{t(locale, 'plot.trigger', { trigger: displayMm(trigger) })}</p>}
      </div>
    </section>
  );
}
