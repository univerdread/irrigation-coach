import type { FlowInput } from './types';

// One mm of water over one m2 is one litre.

/** Normalise any flow input to L/min. Unknown or non-positive flow returns null (never zero). */
export function toLpm(flow: FlowInput | null | undefined): number | null {
  if (!flow) return null;
  let lpm: number | null;
  if (flow.kind === 'bucket') {
    lpm = flow.seconds > 0 ? (flow.litres / flow.seconds) * 60 : null;
  } else {
    if (flow.value === null) return null;
    switch (flow.unit) {
      case 'L/min':
        lpm = flow.value;
        break;
      case 'L/h':
        lpm = flow.value / 60;
        break;
      case 'm3/h':
        lpm = (flow.value * 1000) / 60;
        break;
    }
  }
  return lpm !== null && Number.isFinite(lpm) && lpm > 0 ? lpm : null;
}

/** Gross litres to pump so that `netMm` reaches the root zone of `areaM2` at `efficiency`. */
export function grossLitres(areaM2: number, netMm: number, efficiency: number): number {
  return (areaM2 * netMm) / efficiency;
}

export function pumpMinutes(litres: number, flowLpm: number): number {
  return litres / flowLpm;
}

/** Days from date a to date b (date parts only, UTC). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utcDay(b) - utcDay(a)) / 86_400_000);
}

export function utcDay(dateOrDatetime: string): number {
  const [y, m, d] = dateOrDatetime.slice(0, 10).split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

export function addDays(date: string, n: number): string {
  return new Date(utcDay(date) + n * 86_400_000).toISOString().slice(0, 10);
}
