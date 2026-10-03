import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  createFao56DeficitSource,
  nextDeficitState,
  planFarm,
  type FarmInput,
  type FarmPlan,
} from '@irrigation-coach/engine';
import { t, type Locale } from './i18n/i18n';
import { SCENARIOS, scenario } from './demo/scenarios';
import { DEMO_AREA } from './demo/area';
import { explain, type Explanation } from './ai/explain';
import { getTextModel } from './ai/registry';
import { headline } from './ai/templates';
import { browserKV, LogStore, type LogEntry } from './storage/logStore';
import { SimulatedBanner } from './components/Badges';
import { TodayPlan } from './screens/TodayPlan';
import { PlotInputs } from './screens/PlotInputs';
import { ExplainLog } from './screens/ExplainLog';

type Tab = 'today' | 'plot' | 'log';

// FAO-56 balance driven by the demo area's climatology. For a same-day deficit it adds nothing,
// so the golden scenarios plan exactly as in the tests; "next day" then grows the deficit.
const deficitSource = createFao56DeficitSource({ lat_deg: DEMO_AREA.lat, tmax_c: DEMO_AREA.tmax_c, tmin_c: DEMO_AREA.tmin_c });
const plan = (f: FarmInput): FarmPlan => planFarm(f, { deficitSource });
const store = new LogStore(browserKV());

export function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [tab, setTab] = useState<Tab>('today');
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id);
  const [farm, setFarm] = useState<FarmInput>(() => scenario(SCENARIOS[0]!.id));
  const [entries, setEntries] = useState<LogEntry[]>(() => store.all());
  const [explanation, setExplanation] = useState<Explanation | null>(null);

  const today = useMemo(() => plan(farm), [farm]);
  const [actedOn, setActedOn] = useState<string | null>(null);
  const acted = actedOn === farm.today;

  useEffect(() => {
    let live = true;
    void explain(today, locale, getTextModel()).then((x) => live && setExplanation(x));
    return () => {
      live = false;
    };
  }, [today, locale]);

  const pickScenario = (id: string) => {
    setScenarioId(id);
    setFarm(scenario(id));
    setActedOn(null);
  };

  const onRain = (mm: number | null) => {
    const now = new Date().toISOString();
    setFarm({
      ...farm,
      plots: farm.plots.map((p) => ({ ...p, rain_since_mm: mm === null ? null : { value: mm, unit: 'mm', provenance: 'reported', observed_at: now } })),
    });
  };

  const onAction = (kind: 'done' | 'adjusted' | 'skipped', minutes?: number) => {
    const now = new Date().toISOString();
    const flowLpm = today.flow_lpm ?? 0;
    const entry: LogEntry = {
      id: `${farm.today}-${Date.now()}`,
      created_at: now,
      engine_version: today.engine_version,
      input: farm,
      plan: today,
      action: { kind, reported_at: now, provenance: 'reported', ...(minutes !== undefined ? { minutes_run: minutes, litres_applied: minutes * flowLpm } : {}) },
      ...(explanation ? { explanation: { text: explanation.text, producer: explanation.producer, locale, ...(explanation.model_id ? { model_id: explanation.model_id } : {}) } } : {}),
      events: [],
      shared_with: [],
    };
    store.append(entry);
    setEntries(store.all());
    setActedOn(farm.today);
    // Carry each plot's deficit forward. Adjusted minutes are split across plots in proportion to their allocation.
    const totalAlloc = today.total_litres || 1;
    setFarm({
      ...farm,
      plots: farm.plots.map((p) => {
        const pp = today.plots.find((x) => x.plot_id === p.id)!;
        const action =
          kind === 'adjusted'
            ? { kind, litres_applied: (minutes ?? 0) * flowLpm * (pp.allocated_litres / totalAlloc) }
            : { kind };
        const next = nextDeficitState(p, pp, action as Parameters<typeof nextDeficitState>[2], farm.today);
        return next ? { ...p, deficit: next, rain_since_mm: { value: 0, unit: 'mm', provenance: 'reported' as const }, moisture_check: undefined, assume_due: false } : p;
      }),
    });
  };

  const onNextDay = () => {
    // A new day: rain since the last update is unknown until the farmer reports it.
    setFarm({ ...farm, today: addDays(farm.today, 1), plots: farm.plots.map((p) => ({ ...p, rain_since_mm: null, assume_due: false })) });
  };

  return (
    <div className="app">
      <header className="top">
        <span className="brand">{t(locale, 'app.title')}</span>
        <select aria-label={t(locale, 'scenario.label')} value={scenarioId} onChange={(e) => pickScenario(e.target.value)}>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.label[locale]}</option>
          ))}
        </select>
        <button className="chip" onClick={() => setLocale(locale === 'en' ? 'sw' : 'en')}>{t(locale, 'lang.toggle')}</button>
      </header>
      {today.data_quality.simulated && <SimulatedBanner locale={locale} />}

      <main>
        {tab === 'today' && (
          <TodayPlan plan={today} locale={locale} acted={acted} onRain={onRain} onAction={onAction} onNextDay={onNextDay} spoken={headline(today, locale)} />
        )}
        {tab === 'plot' && <PlotInputs farm={farm} locale={locale} onChange={setFarm} />}
        {tab === 'log' && (
          <ExplainLog
            farm={farm}
            plan={today}
            explanation={explanation}
            entries={entries}
            locale={locale}
            recompute={plan}
            onClear={() => {
              store.clear();
              setEntries([]);
            }}
          />
        )}
      </main>

      <nav className="tabs">
        {(['today', 'plot', 'log'] as Tab[]).map((x) => (
          <button key={x} className={tab === x ? 'tab on' : 'tab'} onClick={() => setTab(x)}>
            {t(locale, `tab.${x}`)}
          </button>
        ))}
      </nav>
    </div>
  );
}
