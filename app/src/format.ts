// Display rounding lives here and only here: the engine keeps exact values (build addendum).
import { t, type Locale } from './i18n/i18n';

/** Pump minutes as shown to the farmer: nearest 5 minutes, never 0 when some pumping is due. */
export function displayMinutes(exact: number): number {
  if (exact <= 0) return 0;
  return Math.max(5, Math.round(exact / 5) * 5);
}

export function splitHM(minutes: number): { h: number; m: number } {
  return { h: Math.floor(minutes / 60), m: minutes % 60 };
}

export function formatDuration(locale: Locale, exactMinutes: number): string {
  const { h, m } = splitHM(displayMinutes(exactMinutes));
  if (h > 0 && m > 0) return t(locale, 'duration.h_m', { h, m });
  if (h > 0) return t(locale, 'duration.h', { h });
  return t(locale, 'duration.m', { m });
}

/** Litres shown to the nearest 10 L. */
export function displayLitres(exact: number): number {
  return Math.round(exact / 10) * 10;
}

/** Depths shown to the nearest whole mm. */
export function displayMm(exact: number): number {
  return Math.round(exact);
}

export function formatNumber(locale: Locale, n: number): string {
  return n.toLocaleString(locale === 'sw' ? 'sw-KE' : 'en-GB');
}
