// What a farmer with a basic (feature) phone gets: the same engine over USSD and SMS.
// This screen runs the real channel code (channels/) against a private copy of the plot.
import { useMemo, useRef, useState } from 'react';
import { planFarm, type FarmInput, type PlanOptions } from '@irrigation-coach/engine';
import { MemoryStore, gsm7Length, handleSms, handleUssd, isGsm7, planText } from '@irrigation-coach/channels';
import { t, type Locale } from '../i18n/i18n';

const PHONE = '+254700000001';
const SHORT_CODE = '*384*123#';

interface Props {
  farm: FarmInput;
  locale: Locale;
  /** The same planning options as the app (deficit source), so every device gives the same answer. */
  planOptions: PlanOptions;
}

export function BasicPhone({ farm, locale, planOptions }: Props) {
  const now = useMemo(() => new Date(`${farm.today}T06:00:00Z`), [farm.today]);
  const store = useRef<MemoryStore | null>(null);
  const seedKey = useRef('');
  const key = JSON.stringify(farm) + locale;
  if (!store.current || seedKey.current !== key) {
    store.current = new MemoryStore();
    store.current.put({ phone: PHONE, locale, farm: structuredClone(farm), consent_at: now.toISOString() });
    seedKey.current = key;
  }

  // USSD
  const [path, setPath] = useState<string[] | null>(null);
  const [screen, setScreen] = useState('');
  const [input, setInput] = useState('');
  const dial = (parts: string[]) => {
    const res = handleUssd({ phoneNumber: PHONE, serviceCode: SHORT_CODE, text: parts.join('*') }, now, store.current!, planOptions);
    setScreen(res);
    setPath(res.startsWith('CON') ? parts : null);
    setInput('');
  };
  const live = screen.startsWith('CON');

  // SMS
  const morning = planText(planFarm(farm, planOptions), locale, 'sms');
  const [thread, setThread] = useState<{ from: 'coach' | 'farmer'; text: string }[]>([]);
  const [sms, setSms] = useState('');
  const send = (text: string) => {
    if (!text.trim()) return;
    const reply = handleSms(PHONE, text, now, store.current!, planOptions);
    setThread((th) => [...th, { from: 'farmer', text }, { from: 'coach', text: reply }]);
    setSms('');
  };
  const quick = locale === 'sw' ? ['LEO', 'MVUA 5', 'NIMEMALIZA', 'KAVU', 'MSAADA'] : ['TODAY', 'RAIN 5', 'DONE', 'DRY', 'HELP'];

  return (
    <section className="basic-phone">
      <div className="season-head">
        <h1 className="screen-title">{t(locale, 'phones.title')}</h1>
        <p className="lede">{t(locale, 'phones.lede')}</p>
      </div>

      <div className="card">
        <h2>{t(locale, 'phones.ussd_title')}</h2>
        <p className="hint">{t(locale, 'phones.ussd_hint')}</p>
        <div className="handset" aria-label={t(locale, 'phones.ussd_title')}>
          <div className="handset-screen" aria-live="polite">
            {screen ? <pre>{screen.replace(/^(CON|END) /, '')}</pre> : <pre className="idle">{SHORT_CODE}</pre>}
          </div>
          {live ? (
            <div className="handset-keys">
              <input
                inputMode="numeric"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && input && dial([...(path ?? []), input])}
                aria-label={t(locale, 'phones.reply')}
                autoFocus
              />
              <button onClick={() => input && dial([...(path ?? []), input])}>{t(locale, 'phones.send')}</button>
              <button className="ghost" onClick={() => { setScreen(''); setPath(null); }}>{t(locale, 'phones.cancel')}</button>
            </div>
          ) : (
            <div className="handset-keys">
              <button className="primary" onClick={() => dial([])}>📞 {t(locale, 'phones.dial', { code: SHORT_CODE })}</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>{t(locale, 'phones.sms_title')}</h2>
        <p className="hint">{t(locale, 'phones.sms_hint')}</p>
        <div className="thread">
          <div className="bubble coach">
            <span className="bubble-time">06:00</span>
            {morning}
          </div>
          {thread.map((m, i) => (
            <div key={i} className={`bubble ${m.from}`}>
              {m.text}
            </div>
          ))}
        </div>
        <p className="hint mono">
          {gsm7Length(morning)}/160 · {isGsm7(morning) ? t(locale, 'phones.one_sms') : 'UCS-2'}
        </p>
        <div className="row wrap">
          {quick.map((qk) => (
            <button key={qk} className="chip" onClick={() => send(qk)}>{qk}</button>
          ))}
        </div>
        <div className="row">
          <input value={sms} onChange={(e) => setSms(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(sms)} aria-label={t(locale, 'phones.reply')} />
          <button onClick={() => send(sms)}>{t(locale, 'phones.send')}</button>
        </div>
      </div>

      <div className="card">
        <h2>{t(locale, 'phones.agent_title')}</h2>
        <p>{t(locale, 'phones.agent_body')}</p>
      </div>

      <p className="disclaimer">{t(locale, 'phones.disclaimer')}</p>
    </section>
  );
}
