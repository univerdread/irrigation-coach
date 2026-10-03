// Pre-purchase check: does this pump keep up with this plot under each irrigation method?
import { grossLitres, pumpMinutes } from './units';

export interface PrePurchaseInput {
  area_m2: number;
  /** Net depth per irrigation cycle, mm (normally RAW = p x TAW). */
  net_depth_mm: number;
  /** Peak-season crop water use, mm/day. */
  etc_mm_per_day: number;
  flow_lpm: number;
  /** Hours per day the pump can realistically run (solar: peak-sun-hours equivalent; fuel: labour/fuel budget). */
  pumping_hours_per_day: number;
  methods: { id: string; efficiency: number }[];
  /** Flag when the cycle needs more than this share of available pump hours. DEMO ASSUMPTION. */
  load_flag_fraction?: number;
}

export interface PrePurchaseResult {
  method_id: string;
  gross_m3_per_cycle: number;
  pump_hours_per_cycle: number;
  cycle_days: number;
  available_hours_per_cycle: number;
  load: number;
  flag: 'ok' | 'pump_too_small';
}

export function prePurchaseCheck(i: PrePurchaseInput): PrePurchaseResult[] {
  const threshold = i.load_flag_fraction ?? 0.8;
  const cycleDays = i.net_depth_mm / i.etc_mm_per_day;
  const available = cycleDays * i.pumping_hours_per_day;
  return i.methods.map((m) => {
    const litres = grossLitres(i.area_m2, i.net_depth_mm, m.efficiency);
    const hours = pumpMinutes(litres, i.flow_lpm) / 60;
    const load = hours / available;
    return {
      method_id: m.id,
      gross_m3_per_cycle: litres / 1000,
      pump_hours_per_cycle: hours,
      cycle_days: cycleDays,
      available_hours_per_cycle: available,
      load,
      flag: load > threshold ? 'pump_too_small' : 'ok',
    };
  });
}
