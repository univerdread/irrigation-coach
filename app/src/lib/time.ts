/** Today's date on the phone, local time, YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weekdayKey(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]!;
}

export function addDaysLocal(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

/** "3 Oct" style label, locale-aware, no network fonts or libraries. */
export function shortDate(locale: 'en' | 'sw', date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString(locale === 'sw' ? 'sw-KE' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
