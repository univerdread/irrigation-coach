// "A month with the coach": simulated coach vs today's habit, plus the pump check.
import { useMemo, useState } from 'react';
import { METHODS, findCrop, prePurchaseCheck, toLpm, type FarmInput } from '@irrigation-coach/engine';
import { t, type Locale } from '../i18n/i18n';
import { LineChart } from '../components/LineChart';
import { StatTile } from '../components/StatTile';
import { Meter } from '../components/Meter';
import { buildMonth, docHabitMinutes, type Weather } from '../lib/month';
import { addDaysLocal, shortDate } from '../lib/time';
import { DEMO_AREA } from '../demo/area';
import { formatNumber } from '../format';

interface Props {
  farm: FarmInput;
  locale: Locale;
  fuel: { l_per_h?: number; price_per_l?: number };
  onFuel: (f: { l_per_h?: number; price_per_l?: number }) => void;
}

const ACCENT = 'var(--water)';
const CONTEXT = 'var(--context)';

export function Season({ farm, locale, fuel, onFuel }: Props) {
  const [plotIdx, setPlotIdx] = useState(0);
  const [weather, setWeather] = useState<Weather>('example');
  const flow = toLpm(farm.pump.flow);
  const plot = farm.plots[plotIdx];
  const defaultHabit = plot?.area_m2?.value && plot.efficiency?.value && flow ? docHabitMinutes(plot.area_m2.value, plot.efficiency.value, flow) : 60;
  const [habit, setHabit] = useState<number | null>(null);
  const habitMin = Math.round(habit ?? defaultHabit);
  const [pumpHours, setPumpHours] = useState(6);

  const m = useMemo(
    () =>
      buildMonth(farm, flow, plotIdx, {
        weather,
        habit_minutes: habitMin,
        start: farm.today,
        climate: { lat: DEMO_AREA.lat, tmax_c: DEMO_AREA.tmax_c, tmin_c: DEMO_AREA.tmin_c },
      }),
    [farm, flow, plotIdx, weather, habitMin],
  );

  if (!m || !plot) {
    return (
      <section className="season">
        <div className="card">
          <h2>{t(locale, 'season.title')}</h2>
          <p>{t(locale, 'season.incomplete')}</p>
        </div>
      </section>
    );
  }

  const m3 = (l: number) => formatNumber(locale, Math.round(l / 1000));
  const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : 0);
  const coachL = m.coach.gross_litres;
  const habitL = m.habit.gross_litres;
  const dayLabel = (i: number) => shortDate(locale, addDaysLocal(farm.today, i));
  const fuelCost = fuel.l_per_h && fuel.price_per_l ? (h: number) => h * fuel.l_per_h! * fuel.price_per_l! : null;
  const crop = plot.crop ? findCrop(plot.crop.crop_id) : undefined;

  const check = prePurchaseCheck({
    area_m2: m.area_m2,
    net_depth_mm: m.raw_mm,
    etc_mm_per_day: Math.max(...m.etc),
    flow_lpm: m.flow_lpm,
    pumping_hours_per_day: pumpHours,
    methods: METHODS.map((x) => ({ id: x.id, efficiency: x.efficiency })),
  });

  return (
    <section className="season">
      <div className="season-head">
        <h1 className="screen-title">{t(locale, 'season.title')}</h1>
        <p className="lede">{t(locale, 'season.lede')}</p>
      </div>

      <div className="controls card">
        {farm.plots.length > 1 && (
          <div className="row wrap" role="group" aria-label={t(locale, 'plan.per_plot')}>
            {farm.plots.map((p, i) => (
              <button key={p.id} className={i === plotIdx ? 'chip on' : 'chip'} onClick={() => setPlotIdx(i)}>
                {p.id} {p.label ?? ''}
              </button>
            ))}
          </div>
        )}
        <div className="seg" role="radiogroup" aria-label={t(locale, 'season.weather')}>
          {(['example', 'climatology'] as Weather[]).map((w) => (
            <button key={w} role="radio" aria-checked={weather === w} className={weather === w ? 'seg-btn on' : 'seg-btn'} onClick={() => setWeather(w)}>
              {t(locale, `season.weather_${w}`)}
            </button>
          ))}
        </div>
        <label className="slider">
          <span>{t(locale, 'season.habit', { minutes: habitMin })}</span>
          <input type="range" min={10} max={240} step={5} value={habitMin} onChange={(e) => setHabit(Number(e.target.value))} />
        </label>
      </div>

      <div className="stats">
        <StatTile
          label={t(locale, 'season.water')}
          value={`${m3(coachL)} m³`}
          compare={t(locale, 'season.vs', { value: `${m3(habitL)} m³` })}
          delta={{ text: `${pct(coachL, habitL)}%`, good: coachL <= habitL }}
        />
        <StatTile
          label={t(locale, 'season.hours')}
          value={`${formatNumber(locale, Math.round(m.coach_pump_hours * 10) / 10)} h`}
          compare={t(locale, 'season.vs', { value: `${formatNumber(locale, Math.round(m.habit_pump_hours * 10) / 10)} h` })}
          delta={{ text: `${formatNumber(locale, Math.round((m.habit_pump_hours - m.coach_pump_hours) * 10) / 10)} h ${t(locale, 'season.saved')}`, good: m.coach_pump_hours <= m.habit_pump_hours }}
        />
        <StatTile
          label={t(locale, 'season.days')}
          value={String(m.coach.irrigation_days.length)}
          compare={t(locale, 'season.vs', { value: String(m.habit.irrigation_days.length) })}
        />
        <StatTile
          label={t(locale, 'season.drained')}
          value={`${formatNumber(locale, Math.round(m.coach.deep_percolation_mm))} mm`}
          compare={t(locale, 'season.vs', { value: `${formatNumber(locale, Math.round(m.habit.deep_percolation_mm))} mm` })}
        />
        {fuelCost && (
          <StatTile
            label={t(locale, 'season.fuel_cost')}
            value={`KES ${formatNumber(locale, Math.round(fuelCost(m.coach_pump_hours)))}`}
            compare={t(locale, 'season.vs', { value: `KES ${formatNumber(locale, Math.round(fuelCost(m.habit_pump_hours)))}` })}
            delta={{ text: `KES ${formatNumber(locale, Math.round(fuelCost(m.habit_pump_hours) - fuelCost(m.coach_pump_hours)))} ${t(locale, 'season.saved')}`, good: true }}
          />
        )}
      </div>

      <div className="card">
        <LineChart
          title={t(locale, 'season.chart_water')}
          subtitle={t(locale, 'season.chart_water_sub')}
          series={[
            { id: 'coach', label: t(locale, 'season.coach'), color: ACCENT, values: m.coach_cum_m3 },
            { id: 'habit', label: t(locale, 'season.habit_series', { minutes: habitMin }), color: CONTEXT, values: m.habit_cum_m3 },
          ]}
          xLabel={dayLabel}
          yFormat={(v) => formatNumber(locale, Math.round(v))}
          unit="m³"
          events={[{ index: 11, label: t(locale, 'season.rain_event') }]}
          tableLabel={t(locale, 'chart.table')}
          xHeader={t(locale, 'chart.day')}
        />
      </div>

      <div className="card">
        <LineChart
          title={t(locale, 'season.chart_soil')}
          subtitle={t(locale, 'season.chart_soil_sub')}
          series={[
            {
              id: 'deficit',
              label: t(locale, 'season.coach'),
              color: ACCENT,
              values: m.coach.daily.map((d) => d.deficit_mm),
              markers: m.coach.irrigation_days.map((day) => ({
                index: day - 1,
                note: t(locale, 'season.pumped_note', { m3: m3((m.coach.daily[day - 1]!.net_irrigation_mm * m.area_m2) / m.efficiency) }),
              })),
            },
          ]}
          xLabel={dayLabel}
          yFormat={(v) => formatNumber(locale, Math.round(v))}
          unit="mm"
          refLines={[{ y: m.raw_mm, label: t(locale, 'season.ref_trigger', { mm: Math.round(m.raw_mm) }) }]}
          events={[{ index: 11, label: t(locale, 'season.rain_event') }]}
          tableLabel={t(locale, 'chart.table')}
          xHeader={t(locale, 'chart.day')}
        />
      </div>

      <details className="card fuel">
        <summary>{t(locale, 'season.fuel_add')}</summary>
        <div className="row">
          <label className="mini">
            {t(locale, 'season.fuel_lph')}
            <input inputMode="decimal" value={fuel.l_per_h ?? ''} onChange={(e) => onFuel({ ...fuel, l_per_h: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </label>
          <label className="mini">
            {t(locale, 'season.fuel_price')}
            <input inputMode="decimal" value={fuel.price_per_l ?? ''} onChange={(e) => onFuel({ ...fuel, price_per_l: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </label>
        </div>
        <p className="hint">{t(locale, 'season.fuel_hint')}</p>
      </details>

      <div className="card">
        <h2>{t(locale, 'pump.title')}</h2>
        <p className="hint">{t(locale, 'pump.lede', { crop: crop?.names[locale] ?? '', area: formatNumber(locale, Math.round(m.area_m2)) })}</p>
        <label className="slider">
          <span>{t(locale, 'pump.hours_per_day', { hours: pumpHours })}</span>
          <input type="range" min={2} max={12} step={1} value={pumpHours} onChange={(e) => setPumpHours(Number(e.target.value))} />
        </label>
        {check.map((c) => {
          const method = METHODS.find((x) => x.id === c.method_id)!;
          return (
            <Meter
              key={c.method_id}
              label={`${method.names[locale] ?? method.names.en} · ${Math.round(method.efficiency * 100)}%`}
              load={c.load}
              detail={t(locale, 'pump.detail', {
                hours: formatNumber(locale, Math.round(c.pump_hours_per_cycle * 10) / 10),
                available: formatNumber(locale, Math.round(c.available_hours_per_cycle)),
                days: formatNumber(locale, Math.round(c.cycle_days * 10) / 10),
              })}
              flagged={c.flag === 'pump_too_small'}
              flagText={t(locale, 'pump.too_small')}
            />
          );
        })}
        <p className="hint">{t(locale, 'pump.paradox')}</p>
      </div>

      <p className="disclaimer">{t(locale, 'season.disclaimer')}</p>
    </section>
  );
}
