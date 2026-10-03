// Inbound SMS commands (English or Kiswahili) -> the same state transitions as the app.
import {
  afterAction,
  freshStart,
  planFarm,
  rollToDay,
  withMoistureCheck,
  withRain,
  type MoistureBand,
  type PlanOptions,
} from '@irrigation-coach/engine';
import { t, type Locale } from './i18n';
import { planText } from './messages';
import type { ProfileStore } from './store';

export type SmsCommand =
  | { kind: 'today' }
  | { kind: 'rain'; mm: number | null }
  | { kind: 'done'; minutes?: number }
  | { kind: 'skip' }
  | { kind: 'check'; band: MoistureBand }
  | { kind: 'soaked' }
  | { kind: 'help' }
  | { kind: 'language'; locale: Locale }
  | { kind: 'unknown' };

const num = (s: string | undefined): number | null => {
  if (!s) return null;
  const m = s.replace(',', '.').match(/^(\d+(?:\.\d+)?)(MM|MIN|DK)?$/);
  return m ? Number(m[1]) : null;
};

export function parseSms(raw: string): SmsCommand {
  const words = raw.trim().toUpperCase().replace(/\s+/g, ' ').split(' ');
  const [w0, w1] = words;
  switch (w0) {
    case 'TODAY':
    case 'PLAN':
    case 'LEO':
      return { kind: 'today' };
    case 'RAIN':
    case 'MVUA': {
      if (w1 === '?' || w1 === 'SIJUI' || w1 === 'UNKNOWN') return { kind: 'rain', mm: null };
      if (w1 === 'HAKUNA' || w1 === 'NONE' || w1 === 'NO') return { kind: 'rain', mm: 0 };
      const mm = num(w1);
      return mm === null ? { kind: 'unknown' } : { kind: 'rain', mm };
    }
    case 'DONE':
    case 'NIMEMALIZA': {
      const minutes = num(w1);
      return minutes === null ? { kind: 'done' } : { kind: 'done', minutes };
    }
    case 'SKIP':
    case 'SIKUWASHA':
      return { kind: 'skip' };
    case 'DRY':
    case 'KAVU':
      return { kind: 'check', band: 'dry' };
    case 'DAMP':
    case 'UNYEVU':
      return { kind: 'check', band: 'ok' };
    case 'WET':
    case 'MAJI':
    case 'MBICHI':
      return { kind: 'check', band: 'wet' };
    case 'SOAKED':
    case 'IMELOWA':
      return { kind: 'soaked' };
    case 'HELP':
    case 'MSAADA':
      return { kind: 'help' };
    case 'SWAHILI':
    case 'KISWAHILI':
      return { kind: 'language', locale: 'sw' };
    case 'ENGLISH':
    case 'KIINGEREZA':
      return { kind: 'language', locale: 'en' };
    default:
      return { kind: 'unknown' };
  }
}

/** Handle one inbound SMS; returns the reply (one GSM-7 SMS). */
export function handleSms(phone: string, text: string, now: Date, store: ProfileStore, opts: PlanOptions = {}): string {
  const profile = store.get(phone);
  if (!profile) return t('sw', 'sms.not_registered');
  const today = now.toISOString().slice(0, 10);
  const at = now.toISOString();
  let farm = rollToDay(profile.farm, today);
  let locale = profile.locale;
  const cmd = parseSms(text);
  let reply: string;
  switch (cmd.kind) {
    case 'today':
      reply = planText(planFarm(farm, opts), locale);
      break;
    case 'rain':
      farm = withRain(farm, cmd.mm, at);
      reply = planText(planFarm(farm, opts), locale);
      break;
    case 'done': {
      const plan = planFarm(farm, opts);
      farm = afterAction(farm, plan, cmd.minutes === undefined ? { kind: 'done' } : { kind: 'adjusted', litres_applied: cmd.minutes * (plan.flow_lpm ?? 0) });
      reply = t(locale, 'sms.saved');
      break;
    }
    case 'skip':
      farm = afterAction(farm, planFarm(farm, opts), { kind: 'skipped' });
      reply = t(locale, 'sms.saved');
      break;
    case 'check':
      farm = withMoistureCheck(farm, cmd.band, 'feel_chart', at, opts);
      reply = planText(planFarm(farm, opts), locale);
      break;
    case 'soaked':
      farm = freshStart(farm);
      reply = planText(planFarm(farm, opts), locale);
      break;
    case 'help':
      reply = t(locale, 'sms.help');
      break;
    case 'language':
      locale = cmd.locale;
      reply = t(locale, 'sms.language');
      break;
    default:
      reply = t(locale, 'sms.unknown');
  }
  store.put({ ...profile, farm, locale });
  return reply;
}

/** The 6 a.m. message for every registered farmer (sent by a scheduler; see server.ts). */
export function morningMessages(store: ProfileStore, now: Date, opts: PlanOptions = {}): { phone: string; text: string }[] {
  const today = now.toISOString().slice(0, 10);
  return store.all().map((p) => {
    const farm = rollToDay(p.farm, today);
    store.put({ ...p, farm });
    return { phone: p.phone, text: planText(planFarm(farm, opts), p.locale) };
  });
}
