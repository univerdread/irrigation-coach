import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  afterAction,
  createFao56DeficitSource,
  freshStart,
  planFarm,
  withMoistureCheck,
  withRain,
  type FarmInput,
  type FarmPlan,
  type MoistureBand,
} from '@irrigation-coach/engine';
import { t, type Locale } from './i18n/i18n';
import { SCENARIOS, scenario } from './demo/scenarios';
import { DEMO_AREA } from './demo/area';
import { explain, type Explanation } from './ai/explain';
import { getTextModel } from './ai/registry';
import { browserKV, LogStore, type LogEntry } from './storage/logStore';
import { clearFarm, loadFarm, loadPrefs, rollToToday, saveFarm, savePrefs, type Prefs } from './lib/myfarm';
import { loadTimer, saveTimer, type TimerState } from './lib/timer';
import { SimulatedBanner } from './components/Badges';
import { TodayPlan } from './screens/TodayPlan';
import { PlotInputs } from './screens/PlotInputs';
import { ExplainLog } from './screens/ExplainLog';
import { Season } from './screens/Season';
import { Setup } from './screens/Setup';
import { BasicPhone } from './screens/BasicPhone';
import { Welcome } from './screens/Welcome';

type Tab = 'today' | 'plot' | 'season' | 'log' | 'phones';
const TABS: { id: Tab; icon: string }[] = [
  { id: 'today', icon: '💧' },
  { id: 'plot', icon: '🌱' },
  { id: 'season', icon: '📈' },
  { id: 'log', icon: '📒' },
  { id: 'phones', icon: '📱' },
];

// FAO-56 balance driven by the area pack's climatology. For a same-day deficit it adds nothing,
// so the golden scenarios plan exactly as in the tests; later days grow the deficit.
const deficitSource = createFao56DeficitSource({ lat_deg: DEMO_AREA.lat, tmax_c: DEMO_AREA.tmax_c, tmin_c: DEMO_AREA.tmin_c });
const plan = (f: FarmInput): FarmPlan => planFarm(f, { deficitSource });
const kv = browserKV();
const store = new LogStore(kv);

export function App() {
  const [prefs, setPrefsState] = useState<Prefs>(() => loadPrefs(kv));
  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    savePrefs(kv, p);
  };
  const locale: Locale = prefs.locale ?? 'en';
  const mode = prefs.mode;

  const [tab, setTab] = useState<Tab>('today');
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id);
  const [demoFarm, setDemoFarm] = useState<FarmInput>(() => scenario(SCENARIOS[0]!.id));
  const [myFarm, setMyFarmState] = useState<FarmInput | null>(() => {
    const f = loadFarm(kv);
    return f ? rollToToday(f) : null;
  });
  const [redoSetup, setRedoSetup] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>(() => store.all());
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [timer, setTimerState] = useState<TimerState | null>(() => loadTimer(kv));
  const [actedOn, setActedOn] = useState<string | null>(null);

  const setMyFarm = (f: FarmInput) => {
    setMyFarmState(f);
    saveFarm(kv, f);
  };
  const setTimer = (x: TimerState | null) => {
    setTimerState(x);
    saveTimer(kv, x);
  };

  const demo = mode !== 'mine';
  const farm: FarmInput | null = demo ? demoFarm : myFarm;
  const setFarm = (f: FarmInput) => (demo ? setDemoFarm(f) : setMyFarm(f));
  const today = useMemo(() => (farm ? plan(farm) : null), [farm]);
  const myEntries = entries.filter((e) => !!e.demo === demo);
  const acted = !!farm && (actedOn === farm.today || (!demo && myEntries.some((e) => e.plan.today === farm.today && e.action.kind !== 'pending')));

  useEffect(() => {
    if (!today) return;
    let live = true;
    void explain(today, locale, getTextModel()).then((x) => live && setExplanation(x));
    return () => {
      live = false;
    };
  }, [today, locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  if (!mode) {
    return <Welcome locale={locale} onLocale={(l) => setPrefs({ ...prefs, locale: l })} onChoose={(m) => setPrefs({ ...prefs, mode: m, locale })} />;
  }

  if (!demo && (!myFarm || redoSetup)) {
    return (
      <div className="app">
        <header className="top">
          <span className="brand">{t(locale, 'app.title')}</span>
          <button className="chip" onClick={() => setPrefs({ ...prefs, locale: locale === 'en' ? 'sw' : 'en' })}>{t(locale, 'lang.toggle')}</button>
        </header>
        <main>
          <Setup
            locale={locale}
            onFinish={(f) => {
              setMyFarm(f);
              setRedoSetup(false);
              setTab('today');
            }}
            onCancel={() => {
              setRedoSetup(false);
              if (!myFarm) setPrefs({ ...prefs, mode: 'demo' });
            }}
          />
        </main>
      </div>
    );
  }

  if (!farm || !today) return null;
  const now = () => new Date().toISOString();

  const onAction = (kind: 'done' | 'adjusted' | 'skipped', minutes?: number) => {
    const flowLpm = today.flow_lpm ?? 0;
    const entry: LogEntry = {
      id: `${farm.today}-${Date.now()}`,
      created_at: now(),
      engine_version: today.engine_version,
      input: farm,
      plan: today,
      action: { kind, reported_at: now(), provenance: 'reported', ...(minutes !== undefined ? { minutes_run: minutes, litres_applied: minutes * flowLpm } : {}) },
      ...(explanation ? { explanation: { text: explanation.text, producer: explanation.producer, locale, ...(explanation.model_id ? { model_id: explanation.model_id } : {}) } } : {}),
      events: [],
      shared_with: [],
      ...(demo ? { demo: true } : {}),
    };
    store.append(entry);
    setEntries(store.all());
    setActedOn(farm.today);
    setFarm(afterAction(farm, today, kind === 'adjusted' ? { kind, litres_applied: (minutes ?? 0) * flowLpm } : { kind }));
  };

  return (
    <div className="app">
      <header className="top">
        <span className="brand">{t(locale, 'app.title')}</span>
        <button className="chip" onClick={() => setPrefs({ ...prefs, locale: locale === 'en' ? 'sw' : 'en' })}>{t(locale, 'lang.toggle')}</button>
      </header>
      {demo ? (
        <div className="demo-strip">
          <span className="badge prov-simulated">{t(locale, 'demo.badge')}</span>
          <select
            aria-label={t(locale, 'scenario.label')}
            value={scenarioId}
            onChange={(e) => {
              setScenarioId(e.target.value);
              setDemoFarm(scenario(e.target.value));
              setActedOn(null);
              setTimer(null);
            }}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.label[locale]}</option>
            ))}
          </select>
          <button className="link" onClick={() => setPrefs({ ...prefs, mode: 'mine' })}>{t(locale, 'demo.my_plot')}</button>
        </div>
      ) : (
        today.data_quality.simulated && <SimulatedBanner locale={locale} />
      )}

      <main>
        {tab === 'today' && (
          <TodayPlan
            plan={today}
            locale={locale}
            acted={acted}
            demo={demo}
            timer={timer && timer.for_date === farm.today ? timer : null}
            onRain={(mm) => setFarm(withRain(farm, mm, now()))}
            onCheck={(band: MoistureBand) => setFarm(withMoistureCheck(farm, band, 'feel_chart', now(), { deficitSource }))}
            onFreshStart={() => setFarm(freshStart(farm))}
            onAction={onAction}
            onTimer={setTimer}
            onNextDay={() => {
              setActedOn(null);
              setFarm({ ...farm, today: addDays(farm.today, 1), plots: farm.plots.map((p) => ({ ...p, rain_since_mm: null, assume_due: false })) });
            }}
            onOpenPlot={() => setTab('plot')}
          />
        )}
        {tab === 'plot' && (
          <>
            <PlotInputs farm={farm} locale={locale} onChange={setFarm} />
            {!demo && (
              <button className="ghost" onClick={() => setRedoSetup(true)}>↺ {t(locale, 'plot.redo_setup')}</button>
            )}
          </>
        )}
        {tab === 'season' && (
          <Season
            farm={farm}
            locale={locale}
            fuel={{ ...(prefs.fuel_l_per_h !== undefined ? { l_per_h: prefs.fuel_l_per_h } : {}), ...(prefs.fuel_price_per_l !== undefined ? { price_per_l: prefs.fuel_price_per_l } : {}) }}
            onFuel={(f) => setPrefs({ ...prefs, fuel_l_per_h: f.l_per_h, fuel_price_per_l: f.price_per_l })}
          />
        )}
        {tab === 'log' && (
          <ExplainLog
            farm={farm}
            plan={today}
            explanation={explanation}
            entries={myEntries}
            locale={locale}
            demo={demo}
            recompute={plan}
            onClear={() => {
              store.replace(entries.filter((e) => !!e.demo !== demo));
              setEntries(store.all());
            }}
            onResetPlot={() => {
              clearFarm(kv);
              setMyFarmState(null);
            }}
            onSwitchMode={() => setPrefs({ ...prefs, mode: demo ? 'mine' : 'demo' })}
          />
        )}
        {tab === 'phones' && <BasicPhone farm={farm} locale={locale} planOptions={{ deficitSource }} />}
      </main>

      <nav className="tabs" aria-label="Main">
        {TABS.map((x) => (
          <button key={x.id} className={tab === x.id ? 'tab on' : 'tab'} aria-current={tab === x.id ? 'page' : undefined} onClick={() => setTab(x.id)}>
            <span className="tab-icon" aria-hidden="true">{x.icon}</span>
            <span className="tab-label">{t(locale, `tab.${x.id}`)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
