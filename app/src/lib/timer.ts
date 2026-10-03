// Pump timer: survives the app being closed (start time is saved, elapsed is computed).
import type { KV } from '../storage/logStore';

const KEY = 'irrigation-coach/pump-timer/v1';

export interface TimerState {
  started_at: number; // ms epoch
  target_minutes: number;
  for_date: string;
}

export function loadTimer(kv: KV): TimerState | null {
  try {
    const raw = kv.getItem(KEY);
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}
export function saveTimer(kv: KV, t: TimerState | null): void {
  if (t) kv.setItem(KEY, JSON.stringify(t));
  else kv.removeItem(KEY);
}
export function elapsedMinutes(t: TimerState, now = Date.now()): number {
  return Math.max(0, (now - t.started_at) / 60_000);
}
