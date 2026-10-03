import { t, type Locale } from './i18n';

/** Same display rule as the app: nearest 5 minutes, never 0 when pumping is due. */
export function displayMinutes(exact: number): number {
  if (exact <= 0) return 0;
  return Math.max(5, Math.round(exact / 5) * 5);
}

export function duration(locale: Locale, exactMinutes: number): string {
  const d = displayMinutes(exactMinutes);
  const h = Math.floor(d / 60);
  const m = d % 60;
  if (h > 0 && m > 0) return t(locale, 'duration.h_m', { h, m });
  if (h > 0) return t(locale, 'duration.h', { h });
  return t(locale, 'duration.m', { m });
}

/** Thousands with a plain comma (ASCII, GSM-7 safe; no locale-specific spaces). */
export function litres(exact: number): string {
  return String(Math.round(exact / 10) * 10).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const MONTHS: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
};

/** "1 Oct" / "1 Okt": short, ASCII. */
export function shortDate(locale: Locale, date: string): string {
  const [, m, d] = date.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[locale][m! - 1]}`;
}
