import en from './i18n/en.json';
import sw from './i18n/sw.json';

export type Locale = 'en' | 'sw';
const DICTS: Record<Locale, Record<string, unknown>> = { en, sw };

export function t(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const raw = DICTS[locale][key] ?? DICTS.en[key] ?? key;
  return String(raw).replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

export function has(locale: Locale, key: string): boolean {
  return typeof DICTS[locale][key] === 'string';
}
