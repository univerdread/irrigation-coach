// USSD menu (e.g. *384*123#): works on any GSM phone over 2G, no data bundle, no app install.
// Request/response follow the Africa's Talking USSD convention: `text` is every input so far
// joined by '*'; reply "CON ..." to continue or "END ..." to close the session.
import { afterAction, planFarm, rollToDay, withMoistureCheck, withRain, type MoistureBand, type PlanOptions } from '@irrigation-coach/engine';
import { t } from './i18n';
import { planText, rainSince } from './messages';
import { shortDate } from './format';
import type { ProfileStore } from './store';

export interface UssdRequest {
  sessionId?: string;
  serviceCode?: string;
  phoneNumber: string;
  text: string;
}

const BANDS: Record<string, MoistureBand> = { '1': 'dry', '2': 'ok', '3': 'wet' };
const con = (s: string) => `CON ${s}`;
const end = (s: string) => `END ${s}`;
const number = (s: string | undefined) => (s !== undefined && /^\d+([.,]\d+)?$/.test(s) ? Number(s.replace(',', '.')) : null);

export function handleUssd(req: UssdRequest, now: Date, store: ProfileStore, opts: PlanOptions = {}): string {
  const profile = store.get(req.phoneNumber);
  if (!profile) return end(t('sw', 'sms.not_registered'));
  const today = now.toISOString().slice(0, 10);
  const at = now.toISOString();
  let farm = rollToDay(profile.farm, today);
  let locale = profile.locale;
  const parts = req.text === '' ? [] : req.text.split('*');
  const save = () => store.put({ ...profile, farm, locale });
  const plan = () => planFarm(farm, opts);
  let out: string;

  const [a, b, c] = parts;
  if (a === undefined) out = con(t(locale, 'ussd.menu'));
  else if (a === '0') {
    locale = locale === 'sw' ? 'en' : 'sw';
    out = end(t(locale, 'sms.language'));
  } else if (a === '1') {
    const p = plan();
    const key = p.question?.key;
    if (b === undefined) {
      if (key === 'ask_rain_since') out = con(t(locale, 'ussd.rain_q', { since: shortDate(locale, rainSince(p, farm.today)) }));
      else if (key === 'ask_moisture_check' || key === 'ask_second_check') out = con(t(locale, 'ussd.check_q'));
      else out = end(planText(p, locale, 'ussd'));
    } else if (key === 'ask_rain_since') {
      const mm = number(b);
      if (mm === null) out = end(t(locale, 'ussd.bad_input'));
      else {
        farm = withRain(farm, mm, at);
        out = end(planText(plan(), locale, 'ussd'));
      }
    } else if (BANDS[b]) {
      farm = withMoistureCheck(farm, BANDS[b]!, 'feel_chart', at, opts);
      out = end(planText(plan(), locale, 'ussd'));
    } else out = end(t(locale, 'ussd.bad_input'));
  } else if (a === '2') {
    if (b === undefined) out = con(t(locale, 'ussd.rain_q', { since: shortDate(locale, rainSince(plan(), farm.plots[0]?.deficit?.as_of ?? farm.today)) }));
    else {
      const mm = number(b);
      if (mm === null) out = end(t(locale, 'ussd.bad_input'));
      else {
        farm = withRain(farm, mm, at);
        out = end(planText(plan(), locale, 'ussd'));
      }
    }
  } else if (a === '3') {
    if (b === undefined) out = con(t(locale, 'ussd.pumped_q'));
    else if (b === '1') {
      farm = afterAction(farm, plan(), { kind: 'done' });
      out = end(t(locale, 'sms.saved'));
    } else if (b === '2' && c === undefined) out = con(t(locale, 'ussd.minutes_q'));
    else if (b === '2') {
      const min = number(c);
      if (min === null) out = end(t(locale, 'ussd.bad_input'));
      else {
        const p = plan();
        farm = afterAction(farm, p, { kind: 'adjusted', litres_applied: min * (p.flow_lpm ?? 0) });
        out = end(t(locale, 'sms.saved'));
      }
    } else if (b === '3') {
      farm = afterAction(farm, plan(), { kind: 'skipped' });
      out = end(t(locale, 'sms.saved'));
    } else out = end(t(locale, 'ussd.bad_input'));
  } else if (a === '4') {
    if (b === undefined) out = con(t(locale, 'ussd.check_q'));
    else if (BANDS[b]) {
      farm = withMoistureCheck(farm, BANDS[b]!, 'feel_chart', at, opts);
      out = end(planText(plan(), locale, 'ussd'));
    } else out = end(t(locale, 'ussd.bad_input'));
  } else out = end(t(locale, 'ussd.bad_input'));

  save();
  return out;
}
