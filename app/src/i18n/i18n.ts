import en from './en.json';
import sw from './sw.json';

export type Locale = 'en' | 'sw';
type Dict = Record<string, string | Record<string, string>>;
const DICTS: Record<Locale, Dict> = { en, sw };

/** Every UI string lives in a translation file (build addendum). Missing keys fall back to English, then the key. */
export function t(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const raw = DICTS[locale][key] ?? DICTS.en[key] ?? key;
  const s = typeof raw === 'string' ? raw : key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

export function hasKey(locale: Locale, key: string): boolean {
  return typeof DICTS[locale][key] === 'string';
}

export const LOCALES: Locale[] = ['en', 'sw'];
