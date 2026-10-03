// "My plot": the farmer's own farm, saved on the phone. Demo scenarios never touch it.
import { rollToDay, type FarmInput } from '@irrigation-coach/engine';
import type { KV } from '../storage/logStore';
import { localToday } from './time';

const KEY = 'irrigation-coach/my-farm/v1';
const PREFS = 'irrigation-coach/prefs/v1';

export interface Prefs {
  locale?: 'en' | 'sw';
  mode?: 'mine' | 'demo';
  fuel_l_per_h?: number;
  fuel_price_per_l?: number;
}

export function loadFarm(kv: KV): FarmInput | null {
  try {
    const raw = kv.getItem(KEY);
    return raw ? (JSON.parse(raw) as FarmInput) : null;
  } catch {
    return null;
  }
}

export function saveFarm(kv: KV, farm: FarmInput): void {
  kv.setItem(KEY, JSON.stringify(farm));
}

export function clearFarm(kv: KV): void {
  kv.removeItem(KEY);
}

/**
 * A new calendar day since the farm was last opened: move `today` forward. Rain since the last
 * update becomes unknown again until the farmer reports it (unknown is never zero).
 */
export function rollToToday(farm: FarmInput, today = localToday()): FarmInput {
  return rollToDay(farm, today);
}

export function loadPrefs(kv: KV): Prefs {
  try {
    return JSON.parse(kv.getItem(PREFS) ?? '{}') as Prefs;
  } catch {
    return {};
  }
}

export function savePrefs(kv: KV, p: Prefs): void {
  kv.setItem(PREFS, JSON.stringify(p));
}
