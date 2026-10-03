// First-time setup: about 20 minutes, ideally with the pump dealer or extension officer.
// One question per screen, big targets, and only tools people already have: their feet (paces)
// or phone GPS, their hands (ribbon test), a bucket and this phone's stopwatch, a tin for rain.
import { useEffect, useRef, useState } from 'react';
import {
  CROPS,
  METHODS,
  TEXTURE_CENTROIDS,
  lookupAreaPack,
  omPctFromOcGPerKg,
  ribbonTextureClass,
  saxtonRawls,
  updateTextureWithRibbon,
  usdaTextureClass,
  type AreaPack,
  type CropStage,
  type FarmInput,
  type MethodId,
  type PlotInput,
  type RibbonTaps,
  type TextureClass,
} from '@irrigation-coach/engine';
import { t, type Locale } from '../i18n/i18n';
import { M2_PER_ACRE, PACE_M, centroid, gpsAreaRelError, pacesAreaM2, polygonAreaM2, type LatLon } from '../lib/geo';
import { addDaysLocal, localToday } from '../lib/time';
import { DEMO_AREA } from '../demo/area';
import { formatNumber } from '../format';

const CROP_ICON: Record<string, string> = { tomato: '🍅', onion_dry: '🧅', cabbage: '🥬', kale: '🥬', sweet_pepper: '🫑' };
const METHOD_ICON: Record<string, string> = { furrow: '〰️', sprinkler: '💦', drip: '💧' };
/** DEMO ASSUMPTION when no soil map covers the plot: topsoil organic matter for the ribbon-only path. */
const DEFAULT_OM_PCT = 1.5;
/**
 * Plausibility ranges (DEMO ASSUMPTIONS, docs/DECISIONS.md D27). Outside them the farmer or helper
 * must confirm: a mistyped digit should never silently become a 10-hectare plot or a fire-hose pump.
 * Area: a smallholder irrigated plot, about 20 m2 to 5 acres. Flow: a small solar pump (~10 L/min)
 * to a large petrol pump (~1,000 L/min). Under 2 s, hand timing error dominates.
 */
const PLAUSIBLE = { area_m2: [20, 20_000], flow_lpm: [3, 1_500], min_seconds: 2 } as const;

type AreaMode = 'gps' | 'paces' | 'type';
type Soaked = 'today' | 'yesterday' | '3days' | 'week' | 'unknown';

interface Props {
  locale: Locale;
  onFinish: (farm: FarmInput) => void;
  onCancel: () => void;
}

export function Setup({ locale, onFinish, onCancel }: Props) {
  const today = localToday();
  const [step, setStep] = useState(0);

  // 1. area
  const [areaMode, setAreaMode] = useState<AreaMode>('paces');
  const [corners, setCorners] = useState<LatLon[]>([]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [paces, setPaces] = useState({ length: '', width: '' });
  const [typed, setTyped] = useState({ value: '', unit: 'm2' as 'm2' | 'acre' });
  // 2-3. crop, method
  const [cropId, setCropId] = useState<string | null>(null);
  const [stage, setStage] = useState<CropStage | null>(null);
  const [method, setMethod] = useState<MethodId | null>(null);
  // 4. soil
  const [prior, setPrior] = useState<{ sand_pct: number; sand_sd: number; clay_pct: number; clay_sd: number; om_pct: number; slope_pct?: number; demo: boolean } | null>(null);
  const [mapMsg, setMapMsg] = useState<string | null>(null);
  const [taps, setTaps] = useState<RibbonTaps>({});
  // 5. pump
  const [bucketL, setBucketL] = useState('20');
  const [seconds, setSeconds] = useState<number | null>(null);
  const [running, setRunning] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  // 6. starting point
  const [soaked, setSoaked] = useState<Soaked | null>(null);
  const [rain, setRain] = useState<{ kind: 'none' | 'mm' | 'unknown'; mm: string }>({ kind: 'none', mm: '' });
  const [confirmed, setConfirmed] = useState<{ area?: number; flow?: number }>({});

  const tick = useRef<number | null>(null);
  useEffect(() => {
    if (running === null) return;
    tick.current = window.setInterval(() => setNow(Date.now()), 100);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [running]);

  // ---- derived values
  const gpsArea = polygonAreaM2(corners);
  const gpsErr = gpsAreaRelError(corners);
  const pacesArea = paces.length && paces.width ? pacesAreaM2(Number(paces.length), Number(paces.width)) : 0;
  const typedArea = typed.value ? Number(typed.value) * (typed.unit === 'acre' ? M2_PER_ACRE : 1) : 0;
  const area = areaMode === 'gps' ? gpsArea : areaMode === 'paces' ? pacesArea : typedArea;
  const ribbon = ribbonTextureClass(taps);
  const soil = soilEstimate(prior, ribbon);
  const flowLpm = seconds && Number(bucketL) > 0 ? (Number(bucketL) / seconds) * 60 : null;
  const elapsed = running !== null ? (now - running) / 1000 : 0;
  const areaOdd = area > 0 && (area < PLAUSIBLE.area_m2[0] || area > PLAUSIBLE.area_m2[1]);
  const areaOk = area > 0 && (!areaOdd || confirmed.area === area);
  const flowOdd = !!flowLpm && (flowLpm < PLAUSIBLE.flow_lpm[0] || flowLpm > PLAUSIBLE.flow_lpm[1] || (seconds ?? 0) < PLAUSIBLE.min_seconds);
  const flowOk = !flowLpm || !flowOdd || confirmed.flow === flowLpm;

  const addCorner = () => {
    if (!('geolocation' in navigator)) {
      setGpsError(t(locale, 'setup.gps_unavailable'));
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsBusy(false);
        setGpsError(null);
        setCorners((c) => [...c, { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy_m: pos.coords.accuracy }]);
      },
      () => {
        setGpsBusy(false);
        setGpsError(t(locale, 'setup.gps_unavailable'));
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  };

  const lookupSoil = async (demo: boolean) => {
    const at = demo ? { lat: DEMO_AREA.lat, lon: DEMO_AREA.lon } : centroid(corners);
    if (!at) {
      setMapMsg(t(locale, 'setup.map_need_gps'));
      return;
    }
    const pack = (await import('../demo/packs/ke-kajiado-kimana-demo.json')).default as unknown as AreaPack;
    const v = lookupAreaPack(pack, at.lat, at.lon)?.values;
    if (!v || v.sand_pct == null || v.clay_pct == null || v.oc_g_per_kg == null) {
      setMapMsg(t(locale, 'setup.map_none'));
      return;
    }
    setMapMsg(null);
    setPrior({
      sand_pct: v.sand_pct,
      sand_sd: v.sand_sd ?? 15,
      clay_pct: v.clay_pct,
      clay_sd: v.clay_sd ?? 10,
      om_pct: omPctFromOcGPerKg(v.oc_g_per_kg),
      ...(v.slope_pct != null ? { slope_pct: v.slope_pct } : {}),
      demo,
    });
  };

  const finish = () => {
    const crop = CROPS.find((c) => c.id === cropId)!;
    const m = METHODS.find((x) => x.id === method)!;
    const soakedDate = soaked === 'today' ? today : soaked === 'yesterday' ? addDaysLocal(today, -1) : soaked === '3days' ? addDaysLocal(today, -3) : soaked === 'week' ? addDaysLocal(today, -7) : null;
    const rainKnown = soakedDate === today || rain.kind === 'none' ? 0 : rain.kind === 'mm' && rain.mm !== '' ? Number(rain.mm) : null;
    const loc = areaMode === 'gps' ? centroid(corners) : null;
    const plot: PlotInput = {
      id: 'A',
      label: crop.names[locale] ?? crop.names.en,
      area_m2: {
        value: area,
        unit: 'm2',
        provenance: areaMode === 'gps' ? 'measured' : 'reported',
        source: areaMode === 'gps' ? `GPS, ${corners.length} corners` : areaMode === 'paces' ? `paces ${paces.length} x ${paces.width} at ${PACE_M} m` : 'typed',
        observed_at: new Date().toISOString(),
      },
      method: m.id,
      efficiency: { value: m.efficiency, unit: 'fraction', provenance: 'table', source: `methods.json ${m.id}` },
      crop: { crop_id: crop.id, stage, provenance: 'reported' },
      soil_awc_mm_per_m: soil
        ? { value: soil.awc, unit: 'mm/m', provenance: soil.provenance, source: soil.source }
        : null,
      deficit: soakedDate ? { mm: 0, as_of: soakedDate, provenance: 'reported', source: 'farmer: soil last soaked' } : null,
      rain_since_mm: soakedDate ? (rainKnown === null ? null : { value: rainKnown, unit: 'mm', provenance: 'reported', observed_at: new Date().toISOString() }) : { value: 0, unit: 'mm', provenance: 'reported' },
      context: {
        ...(soil ? { clay_pct: soil.clay_pct } : {}),
        ...(prior?.slope_pct != null && !prior.demo ? { slope_pct: prior.slope_pct } : {}),
      },
      ...(loc ? { location: { lat: loc.lat, lon: loc.lon } } : {}),
    };
    onFinish({
      today,
      pump: { flow: flowLpm ? { kind: 'bucket', litres: Number(bucketL), seconds: seconds!, provenance: 'measured', observed_at: new Date().toISOString() } : null },
      plots: [plot],
    });
  };

  const steps = ['intro', 'area', 'crop', 'method', 'soil', 'pump', 'start', 'done'] as const;
  const canNext: Record<(typeof steps)[number], boolean> = {
    intro: true,
    area: areaOk,
    crop: cropId !== null && stage !== null,
    method: method !== null,
    soil: true,
    pump: flowOk,
    start: soaked !== null,
    done: true,
  };
  const name = steps[step]!;

  return (
    <section className="setup" aria-live="polite">
      {step > 0 && step < steps.length - 1 && (
        <div className="progress" aria-label={t(locale, 'setup.step', { n: step, total: steps.length - 2 })}>
          {steps.slice(1, -1).map((s, i) => (
            <span key={s} className={i < step ? 'dot on' : 'dot'} />
          ))}
        </div>
      )}

      {name === 'intro' && (
        <div className="card big">
          <h1 className="screen-title">{t(locale, 'setup.title')}</h1>
          <p className="lede">{t(locale, 'setup.intro')}</p>
          <ul className="needs">
            <li>🪣 {t(locale, 'setup.need_bucket')}</li>
            <li>✋ {t(locale, 'setup.need_soil')}</li>
            <li>🚶 {t(locale, 'setup.need_walk')}</li>
          </ul>
        </div>
      )}

      {name === 'area' && (
        <div className="card big">
          <h1 className="screen-title">{t(locale, 'setup.area_q')}</h1>
          <div className="seg" role="radiogroup">
            {(['paces', 'gps', 'type'] as AreaMode[]).map((mode) => (
              <button key={mode} role="radio" aria-checked={areaMode === mode} className={areaMode === mode ? 'seg-btn on' : 'seg-btn'} onClick={() => setAreaMode(mode)}>
                {t(locale, `setup.area_${mode}`)}
              </button>
            ))}
          </div>
          {areaMode === 'paces' && (
            <>
              <p className="hint">{t(locale, 'setup.paces_how')}</p>
              <div className="row">
                <label className="mini">
                  {t(locale, 'setup.paces_length')}
                  <input inputMode="numeric" value={paces.length} onChange={(e) => setPaces({ ...paces, length: e.target.value })} />
                </label>
                <span className="times">×</span>
                <label className="mini">
                  {t(locale, 'setup.paces_width')}
                  <input inputMode="numeric" value={paces.width} onChange={(e) => setPaces({ ...paces, width: e.target.value })} />
                </label>
              </div>
            </>
          )}
          {areaMode === 'gps' && (
            <>
              <p className="hint">{t(locale, 'setup.gps_how')}</p>
              <div className="row wrap">
                <button className="primary" onClick={addCorner} disabled={gpsBusy}>
                  📍 {gpsBusy ? t(locale, 'setup.gps_wait') : t(locale, 'setup.gps_add', { n: corners.length + 1 })}
                </button>
                {corners.length > 0 && (
                  <button className="ghost" onClick={() => setCorners((c) => c.slice(0, -1))}>
                    {t(locale, 'setup.undo')}
                  </button>
                )}
              </div>
              {gpsError && <p className="warn-text">{gpsError}</p>}
              {corners.length > 0 && (
                <p className="hint mono">
                  {t(locale, 'setup.gps_corners', { n: corners.length })} · ±{Math.round(corners.at(-1)!.accuracy_m ?? 0)} m
                </p>
              )}
              {gpsErr !== null && gpsErr > 0.2 && <p className="warn-text">{t(locale, 'setup.gps_rough', { pct: Math.round(gpsErr * 100) })}</p>}
            </>
          )}
          {areaMode === 'type' && (
            <div className="row">
              <input inputMode="decimal" aria-label={t(locale, 'plot.area')} value={typed.value} onChange={(e) => setTyped({ ...typed, value: e.target.value })} />
              <button className="chip" onClick={() => setTyped({ ...typed, unit: typed.unit === 'm2' ? 'acre' : 'm2' })}>
                {typed.unit === 'm2' ? 'm²' : t(locale, 'plot.area_unit_acre')}
              </button>
            </div>
          )}
          {area > 0 && (
            <p className="answer">
              ≈ {formatNumber(locale, Math.round(area))} m² ({formatNumber(locale, Math.round((area / M2_PER_ACRE) * 100) / 100)} {t(locale, 'plot.area_unit_acre')})
            </p>
          )}
          {areaOdd && (
            <div className="confirm">
              <p className="warn-text">{area > PLAUSIBLE.area_m2[1] ? t(locale, 'setup.area_big') : t(locale, 'setup.area_small')}</p>
              <label className="check">
                <input type="checkbox" checked={confirmed.area === area} onChange={(e) => setConfirmed({ ...confirmed, area: e.target.checked ? area : undefined })} />
                {t(locale, 'setup.confirm_right')}
              </label>
            </div>
          )}
        </div>
      )}

      {name === 'crop' && (
        <div className="card big">
          <h1 className="screen-title">{t(locale, 'setup.crop_q')}</h1>
          <div className="grid-choices">
            {CROPS.map((c) => (
              <button key={c.id} className={cropId === c.id ? 'choice on' : 'choice'} onClick={() => setCropId(c.id)}>
                <span className="choice-icon" aria-hidden="true">{CROP_ICON[c.id] ?? '🌱'}</span>
                {c.names[locale] ?? c.names.en}
              </button>
            ))}
          </div>
          {cropId && (
            <>
              <h2 className="sub-q">{t(locale, 'setup.stage_q')}</h2>
              <div className="stack">
                {(['ini', 'dev', 'mid', 'late'] as CropStage[]).map((s) => (
                  <button key={s} className={stage === s ? 'choice wide on' : 'choice wide'} onClick={() => setStage(s)}>
                    <strong>{t(locale, `stage.${s}`)}</strong>
                    <span className="choice-hint">{t(locale, `stage.${s}_hint`)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {name === 'method' && (
        <div className="card big">
          <h1 className="screen-title">{t(locale, 'setup.method_q')}</h1>
          <div className="stack">
            {METHODS.map((m) => (
              <button key={m.id} className={method === m.id ? 'choice wide on' : 'choice wide'} onClick={() => setMethod(m.id)}>
                <strong>
                  <span aria-hidden="true">{METHOD_ICON[m.id]}</span> {m.names[locale] ?? m.names.en}
                </strong>
                <span className="choice-hint">{t(locale, `method.${m.id}_hint`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {name === 'soil' && (
        <div className="card big">
          <h1 className="screen-title">{t(locale, 'setup.soil_q')}</h1>
          <h2 className="sub-q">1 · {t(locale, 'setup.soil_map')}</h2>
          <div className="row wrap">
            <button className="ghost" onClick={() => void lookupSoil(false)}>🗺️ {t(locale, 'setup.map_here')}</button>
            <button className="ghost small" onClick={() => void lookupSoil(true)}>{t(locale, 'setup.map_demo')}</button>
          </div>
          {mapMsg && <p className="hint">{mapMsg}</p>}
          {prior && (
            <p className="hint mono">
              {prior.demo ? `${t(locale, 'setup.demo_point')} · ` : ''}
              {usdaTextureClass(prior.sand_pct, prior.clay_pct)} · sand {prior.sand_pct}±{prior.sand_sd}% · clay {prior.clay_pct}±{prior.clay_sd}%
            </p>
          )}
          <h2 className="sub-q">2 · {t(locale, 'setup.ribbon')}</h2>
          <p className="hint">{t(locale, 'setup.ribbon_how')}</p>
          <p className="q-line">{t(locale, 'setup.ribbon_ball')}</p>
          <div className="row">
            <button className={taps.forms_ball === true ? 'chip on' : 'chip'} onClick={() => setTaps({ forms_ball: true })}>{t(locale, 'yes')}</button>
            <button className={taps.forms_ball === false ? 'chip on' : 'chip'} onClick={() => setTaps({ forms_ball: false })}>{t(locale, 'no')}</button>
          </div>
          {taps.forms_ball && (
            <>
              <p className="q-line">{t(locale, 'setup.ribbon_len')}</p>
              <div className="stack">
                {(['none', 'short', 'medium', 'long'] as const).map((r) => (
                  <button key={r} className={taps.ribbon === r ? 'choice wide on' : 'choice wide'} onClick={() => setTaps({ forms_ball: true, ribbon: r })}>
                    {t(locale, `ribbon.${r}`)}
                  </button>
                ))}
              </div>
            </>
          )}
          {taps.ribbon && taps.ribbon !== 'none' && (
            <>
              <p className="q-line">{t(locale, 'setup.ribbon_feel')}</p>
              <div className="row wrap">
                {(['gritty', 'smooth', 'neither'] as const).map((f) => (
                  <button key={f} className={taps.feel === f ? 'chip on' : 'chip'} onClick={() => setTaps({ ...taps, feel: f })}>
                    {t(locale, `feel.${f}`)}
                  </button>
                ))}
              </div>
            </>
          )}
          {soil ? (
            <p className="answer">{t(locale, 'setup.soil_result', { texture: soil.texture, awc: Math.round(soil.awc) })}</p>
          ) : (
            <p className="hint">{t(locale, 'setup.soil_skip')}</p>
          )}
        </div>
      )}

      {name === 'pump' && (
        <div className="card big">
          <h1 className="screen-title">{t(locale, 'setup.pump_q')}</h1>
          <p className="hint">{t(locale, 'setup.pump_how')}</p>
          <label className="mini">
            {t(locale, 'setup.bucket_size')}
            <input inputMode="decimal" value={bucketL} onChange={(e) => setBucketL(e.target.value)} />
          </label>
          <div className="stopwatch">
            <span className="sw-time" aria-live="off">{(running !== null ? elapsed : (seconds ?? 0)).toFixed(1)} s</span>
            {running === null ? (
              <button
                className="primary"
                onClick={() => {
                  setSeconds(null);
                  setRunning(Date.now());
                  setNow(Date.now());
                }}
              >
                ▶ {t(locale, 'setup.sw_start')}
              </button>
            ) : (
              <button
                className="primary stop"
                onClick={() => {
                  setSeconds(Math.round(((Date.now() - running) / 1000) * 10) / 10);
                  setRunning(null);
                }}
              >
                ■ {t(locale, 'setup.sw_stop')}
              </button>
            )}
          </div>
          <details>
            <summary>{t(locale, 'setup.sw_type')}</summary>
            <input inputMode="decimal" aria-label={t(locale, 'plot.bucket_seconds')} value={seconds ?? ''} onChange={(e) => setSeconds(e.target.value === '' ? null : Number(e.target.value))} />
          </details>
          {flowLpm && (
            <p className="answer">
              {t(locale, 'setup.flow_result', { lpm: formatNumber(locale, Math.round(flowLpm)), lph: formatNumber(locale, Math.round((flowLpm * 60) / 100) * 100) })}
            </p>
          )}
          {flowLpm && flowOdd && (
            <div className="confirm">
              <p className="warn-text">{(seconds ?? 0) < PLAUSIBLE.min_seconds ? t(locale, 'setup.flow_too_quick') : t(locale, 'setup.flow_odd')}</p>
              <label className="check">
                <input type="checkbox" checked={confirmed.flow === flowLpm} onChange={(e) => setConfirmed({ ...confirmed, flow: e.target.checked ? flowLpm : undefined })} />
                {t(locale, 'setup.confirm_right')}
              </label>
            </div>
          )}
          <p className="hint">{t(locale, 'setup.pump_repeat')}</p>
        </div>
      )}

      {name === 'start' && (
        <div className="card big">
          <h1 className="screen-title">{t(locale, 'setup.soaked_q')}</h1>
          <p className="hint">{t(locale, 'setup.soaked_hint')}</p>
          <div className="stack">
            {(['today', 'yesterday', '3days', 'week', 'unknown'] as Soaked[]).map((s) => (
              <button key={s} className={soaked === s ? 'choice wide on' : 'choice wide'} onClick={() => setSoaked(s)}>
                {t(locale, `soaked.${s}`)}
              </button>
            ))}
          </div>
          {soaked && soaked !== 'today' && soaked !== 'unknown' && (
            <>
              <h2 className="sub-q">{t(locale, 'setup.rain_since_q')}</h2>
              <p className="hint">{t(locale, 'rain.hint')}</p>
              <div className="row wrap">
                <button className={rain.kind === 'none' ? 'chip on' : 'chip'} onClick={() => setRain({ kind: 'none', mm: '' })}>{t(locale, 'rain.none')}</button>
                <button className={rain.kind === 'mm' ? 'chip on' : 'chip'} onClick={() => setRain({ ...rain, kind: 'mm' })}>{t(locale, 'setup.rain_some')}</button>
                <button className={rain.kind === 'unknown' ? 'chip on' : 'chip'} onClick={() => setRain({ kind: 'unknown', mm: '' })}>{t(locale, 'rain.unknown')}</button>
              </div>
              {rain.kind === 'mm' && (
                <label className="mini">
                  mm
                  <input inputMode="decimal" value={rain.mm} onChange={(e) => setRain({ kind: 'mm', mm: e.target.value })} />
                </label>
              )}
            </>
          )}
          {soaked === 'unknown' && <p className="hint">{t(locale, 'setup.soaked_unknown')}</p>}
        </div>
      )}

      {name === 'done' && (
        <div className="card big">
          <h1 className="screen-title">{t(locale, 'setup.done_title')}</h1>
          <ul className="summary">
            <li>{t(locale, 'plot.area')}: <strong>{formatNumber(locale, Math.round(area))} m²</strong> ({formatNumber(locale, Math.round((area / M2_PER_ACRE) * 100) / 100)} {t(locale, 'plot.area_unit_acre')})</li>
            <li>{t(locale, 'plot.crop')}: <strong>{CROPS.find((c) => c.id === cropId)?.names[locale]}</strong> · {stage && t(locale, `stage.${stage}`)}</li>
            <li>{t(locale, 'plot.method')}: <strong>{METHODS.find((m) => m.id === method)?.names[locale]}</strong></li>
            <li>{t(locale, 'plot.soil')}: <strong>{soil ? `${soil.texture}, ${Math.round(soil.awc)} mm/m` : t(locale, 'setup.later')}</strong></li>
            <li>{t(locale, 'plot.pump')}: <strong>{flowLpm ? `${formatNumber(locale, Math.round(flowLpm))} L/min` : t(locale, 'setup.later')}</strong></li>
          </ul>
          {(!soil || !flowLpm || soaked === 'unknown') && <p className="hint">{t(locale, 'setup.later_hint')}</p>}
        </div>
      )}

      <div className="wizard-nav">
        {step === 0 ? (
          <button className="ghost" onClick={onCancel}>{t(locale, 'setup.try_demo')}</button>
        ) : (
          <button className="ghost" onClick={() => setStep((s) => s - 1)}>← {t(locale, 'setup.back')}</button>
        )}
        {name === 'done' ? (
          <button className="primary" onClick={finish}>{t(locale, 'setup.see_plan')} →</button>
        ) : (
          <button className="primary" disabled={!canNext[name]} onClick={() => setStep((s) => s + 1)}>
            {name === 'soil' && !soil ? t(locale, 'setup.skip') : name === 'pump' && !flowLpm ? t(locale, 'setup.skip') : step === 0 ? t(locale, 'setup.start') : t(locale, 'setup.next')} →
          </button>
        )}
      </div>
    </section>
  );
}

function soilEstimate(
  prior: { sand_pct: number; sand_sd: number; clay_pct: number; clay_sd: number; om_pct: number; demo: boolean } | null,
  ribbon: TextureClass | null,
): { awc: number; texture: string; clay_pct: number; provenance: 'mapped' | 'estimated'; source: string } | null {
  if (!prior && !ribbon) return null;
  const om = prior?.om_pct ?? DEFAULT_OM_PCT;
  const tex = prior && ribbon ? updateTextureWithRibbon(prior, ribbon) : prior ?? { ...TEXTURE_CENTROIDS[ribbon!], sand_sd: 0, clay_sd: 0 };
  const r = saxtonRawls({ sand_pct: tex.sand_pct, clay_pct: tex.clay_pct, om_pct: om });
  const texture = usdaTextureClass(tex.sand_pct, tex.clay_pct);
  if (prior && !ribbon) return { awc: r.awc_mm_per_m, texture, clay_pct: tex.clay_pct, provenance: 'mapped', source: `iSDAsoil${prior.demo ? ' (demo point)' : ''}; Saxton & Rawls 2006` };
  return {
    awc: r.awc_mm_per_m,
    texture,
    clay_pct: tex.clay_pct,
    provenance: 'estimated',
    source: prior ? `map prior + ribbon (${ribbon}); Saxton & Rawls 2006` : `ribbon (${ribbon}); Saxton & Rawls 2006, OM ${DEFAULT_OM_PCT}% assumed`,
  };
}
