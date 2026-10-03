// The farmer's log stays on the phone. Nothing leaves it without an explicit share (idea doc, guardrails).
import type { FarmInput, FarmPlan } from '@irrigation-coach/engine';

export interface LogEntry {
  id: string;
  created_at: string;
  engine_version: string;
  input: FarmInput;
  plan: FarmPlan;
  action: { kind: 'pending' | 'done' | 'adjusted' | 'skipped'; litres_applied?: number; minutes_run?: number; reported_at?: string; provenance?: 'reported' };
  explanation?: { text: string; producer: 'template' | 'model'; model_id?: string; locale?: string };
  events?: { kind: string; at: string; plot_id?: string; data?: Record<string, unknown> }[];
  shared_with?: { party: string; at: string }[];
  /** true for demo-scenario entries; they never mix with the farmer's own log. */
  demo?: boolean;
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export class LogStore {
  static readonly KEY = 'irrigation-coach/log/v1';
  constructor(private readonly kv: KV) {}

  all(): LogEntry[] {
    try {
      const raw = this.kv.getItem(LogStore.KEY);
      return raw ? (JSON.parse(raw) as LogEntry[]) : [];
    } catch {
      return [];
    }
  }
  append(e: LogEntry): void {
    this.kv.setItem(LogStore.KEY, JSON.stringify([...this.all(), e]));
  }
  clear(): void {
    this.kv.removeItem(LogStore.KEY);
  }
  replace(entries: LogEntry[]): void {
    this.kv.setItem(LogStore.KEY, JSON.stringify(entries));
  }
}

export function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

/** localStorage when available (it can throw in private windows); memory otherwise. */
export function browserKV(): KV {
  try {
    const probe = '__probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return memoryKV();
  }
}
