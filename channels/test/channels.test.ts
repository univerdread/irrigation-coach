import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createFao56DeficitSource, planFarm, type FarmInput } from '@irrigation-coach/engine';
import { handleSms, handleUssd, isGsm7, gsm7Length, MemoryStore, morningMessages, parseSms, planText, SMS_MAX, USSD_MAX } from '../src/index';
import en from '../src/i18n/en.json';
import sw from '../src/i18n/sw.json';

const GOLDEN = join(import.meta.dirname, '..', '..', 'contracts', 'fixtures', 'golden');
const fixtures = readdirSync(GOLDEN).map((f) => JSON.parse(readFileSync(join(GOLDEN, f), 'utf8')) as { id: string; input: FarmInput });
const worked = fixtures.find((f) => f.id === '07-worked-example-bucket-test')!.input;
const NOW = new Date('2026-10-03T06:00:00Z');

function storeWith(farm: FarmInput, locale: 'sw' | 'en' = 'sw') {
  const s = new MemoryStore();
  s.put({ phone: '+254700000001', locale, farm: structuredClone(farm), consent_at: '2026-10-03T05:00:00Z' });
  return s;
}

describe('every message fits a basic phone', () => {
  it('all strings are GSM-7 (one SMS = 160 chars, no garbling)', () => {
    for (const d of [en, sw]) for (const [k, v] of Object.entries(d)) if (typeof v === 'string') expect(isGsm7(v), k).toBe(true);
  });
  it('every golden scenario renders as one SMS and one USSD screen, in both languages', () => {
    for (const f of fixtures) {
      const plan = planFarm(f.input);
      for (const loc of ['en', 'sw'] as const) {
        const sms = planText(plan, loc, 'sms');
        const ussd = planText(plan, loc, 'ussd');
        expect(isGsm7(sms) && gsm7Length(sms) <= SMS_MAX, `${f.id}/${loc}: ${sms.length} ${sms}`).toBe(true);
        expect(ussd.length + 4, `${f.id}/${loc} ussd`).toBeLessThanOrEqual(USSD_MAX);
      }
    }
  });
  it('the worked example reads as the idea doc sentence', () => {
    expect(planText(planFarm(worked), 'sw')).toContain('washa pampu kwa saa 4 na dakika 10 leo (lita 50,000)');
  });
  it('menus fit a USSD screen', () => {
    for (const d of [en, sw]) for (const [k, v] of Object.entries(d)) if (k.startsWith('ussd.') && typeof v === 'string') expect(v.length + 4, k).toBeLessThanOrEqual(USSD_MAX);
  });
  it('same keys and placeholders in both languages', () => {
    expect(Object.keys(sw).sort()).toEqual(Object.keys(en).sort());
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [k, v] of Object.entries(en)) if (typeof v === 'string') expect(ph((sw as unknown as Record<string, string>)[k]!), k).toEqual(ph(v));
  });
});

describe('SMS commands', () => {
  it('parses English and Kiswahili', () => {
    expect(parseSms('mvua 12')).toEqual({ kind: 'rain', mm: 12 });
    expect(parseSms('RAIN 2,5mm')).toEqual({ kind: 'rain', mm: 2.5 });
    expect(parseSms('mvua sijui')).toEqual({ kind: 'rain', mm: null });
    expect(parseSms('Nimemaliza')).toEqual({ kind: 'done' });
    expect(parseSms('done 90')).toEqual({ kind: 'done', minutes: 90 });
    expect(parseSms('kavu')).toEqual({ kind: 'check', band: 'dry' });
    expect(parseSms('hello')).toEqual({ kind: 'unknown' });
  });
  it('a day by SMS: morning message, rain report, done', () => {
    const store = storeWith(worked);
    expect(handleSms('+254700000001', 'LEO', NOW, store)).toContain('saa 4 na dakika 10');
    expect(handleSms('+254700000001', 'NIMEMALIZA', NOW, store)).toBe('Imehifadhiwa, asante.');
    const tomorrow = new Date('2026-10-04T06:00:00Z');
    expect(morningMessages(store, tomorrow)[0]!.text).toContain('tangu 3 Okt');
    expect(handleSms('+254700000001', 'MVUA 0', tomorrow, store)).toContain('hakuna haja');
  });
  it('unregistered numbers are told where to go', () => {
    expect(handleSms('+254799999999', 'LEO', NOW, new MemoryStore())).toContain('wakala');
  });
});

describe('USSD session', () => {
  it('menu -> plan, and a session that answers the rain question', () => {
    const store = storeWith(worked, 'en');
    expect(handleUssd({ phoneNumber: '+254700000001', text: '' }, NOW, store)).toMatch(/^CON Pump coach\n1\. Today's plan/);
    expect(handleUssd({ phoneNumber: '+254700000001', text: '1' }, NOW, store)).toBe('END Run the pump for 4 h 10 min today (50,000 L). Dial again and choose 3 when done.');
    expect(handleUssd({ phoneNumber: '+254700000001', text: '3*1' }, NOW, store)).toBe('END Saved, thank you.');
    const next = new Date('2026-10-04T06:00:00Z');
    expect(handleUssd({ phoneNumber: '+254700000001', text: '1' }, next, store)).toBe('CON Rain since 3 Oct, in mm (0 if none):');
    expect(handleUssd({ phoneNumber: '+254700000001', text: '1*0' }, next, store)).toMatch(/^END Pump coach: no pumping needed today/);
  });
  it('a soil check that disagrees twice reaches the extension officer', () => {
    const store = storeWith(worked, 'en');
    expect(handleUssd({ phoneNumber: '+254700000001', text: '4*3' }, NOW, store)).toMatch(/choose 4 and check once more/);
    expect(handleUssd({ phoneNumber: '+254700000001', text: '4*3' }, NOW, store)).toMatch(/extension officer/);
  });
  it('rejects bad input without changing state', () => {
    const store = storeWith(worked, 'en');
    expect(handleUssd({ phoneNumber: '+254700000001', text: '2*abc' }, NOW, store)).toBe('END Sorry, please enter a number.');
  });
});

describe('every device gives the same answer', () => {
  it('SMS and USSD use the same deficit source as the app (a week-old soaking has dried out)', () => {
    const opts = { deficitSource: createFao56DeficitSource({ lat_deg: -2.8, tmax_c: Array(12).fill(29), tmin_c: Array(12).fill(9) }) };
    const farm = structuredClone(worked);
    farm.plots[0]!.deficit = { mm: 0, as_of: '2026-09-26', provenance: 'reported' };
    farm.plots[0]!.rain_since_mm = { value: 0, unit: 'mm', provenance: 'reported' };
    const app = planFarm(farm, opts);
    expect(app.status).toBe('pump');
    const store = storeWith(farm, 'en');
    expect(handleSms('+254700000001', 'TODAY', NOW, store, opts)).toBe(planText(app, 'en', 'sms'));
    expect(handleUssd({ phoneNumber: '+254700000001', text: '1' }, NOW, storeWith(farm, 'en'), opts)).toBe(`END ${planText(app, 'en', 'ussd')}`);
    expect(morningMessages(storeWith(farm, 'en'), NOW, opts)[0]!.text).toBe(planText(app, 'en', 'sms'));
  });
});
