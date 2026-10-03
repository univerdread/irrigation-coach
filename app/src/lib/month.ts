// The 30-day "coach vs habit" month for the Season screen. Pure: same inputs, same chart.
import { dailyEtc, findCrop, simulate, type FarmInput, type SimulateResult } from '@irrigation-coach/engine';

export type Weather = 'example' | 'climatology';

export interface MonthOptions {
  weather: Weather;
  /** Today's habit: minutes the pump runs every day. */
  habit_minutes: number;
  days?: number;
  /** Illustrative shower, as in the idea doc's worked example. */
  rain_day?: number;
  rain_mm?: number;
  start: string;
  climate: { lat: number; tmax_c: number[]; tmin_c: number[] };
}

export interface MonthResult {
  days: number;
  area_m2: number;
  efficiency: number;
  flow_lpm: number;
  taw_mm: number;
  raw_mm: number;
  etc: number[];
  coach: SimulateResult;
  habit: SimulateResult;
  habit_net_mm_per_day: number;
  /** Cumulative gross m3 pumped by the end of each day. */
  coach_cum_m3: number[];
  habit_cum_m3: number[];
  coach_pump_hours: number;
  habit_pump_hours: number;
}

/** null if the plot lacks what the simulation needs (the UI then says what's missing). */
export function buildMonth(farm: FarmInput, flowLpm: number | null, plotIndex: number, o: MonthOptions): MonthResult | null {
  const plot = farm.plots[plotIndex];
  if (!plot || !flowLpm) return null;
  const area = plot.area_m2?.value;
  const eff = plot.efficiency?.value;
  const awc = plot.soil_awc_mm_per_m?.value;
  const crop = plot.crop ? findCrop(plot.crop.crop_id) : undefined;
  if (!area || !eff || !awc || !crop || !plot.crop) return null;

  const days = o.days ?? 30;
  const zr = plot.root_depth_m?.value ?? crop.root_depth_m.min;
  const p = plot.p?.value ?? crop.p;
  const taw = awc * zr;
  const raw = p * taw;
  const etc =
    o.weather === 'example'
      ? Array.from({ length: days }, () => 5.0 * crop.kc.mid) // worked example: ETo 5 mm/day x Kc mid
      : dailyEtc({
          lat_deg: o.climate.lat,
          tmax_c: o.climate.tmax_c,
          tmin_c: o.climate.tmin_c,
          crop_id: crop.id,
          stage: plot.crop.stage,
          ...(plot.crop.planting_date ? { planting_date: plot.crop.planting_date } : {}),
          start: o.start,
          days,
        }).map((d) => d.etc_mm);
  const rainDay = o.rain_day ?? 12;
  const rainMm = o.rain_mm ?? 20;
  const habitNet = (o.habit_minutes * flowLpm * eff) / area;
  const common = {
    days,
    taw_mm: taw,
    raw_mm: raw,
    area_m2: area,
    efficiency: eff,
    etc_mm_per_day: (d: number) => etc[d - 1]!,
    rain_mm: (d: number) => (d === rainDay ? rainMm : 0),
    initial_deficit_mm: 0,
  };
  const coach = simulate({ ...common, strategy: { kind: 'coach' } });
  const habit = simulate({ ...common, strategy: { kind: 'fixed_daily', net_mm: habitNet } });
  const cum = (r: SimulateResult) => {
    let s = 0;
    return r.daily.map((d) => (s += (d.net_irrigation_mm * area) / eff / 1000));
  };
  return {
    days,
    area_m2: area,
    efficiency: eff,
    flow_lpm: flowLpm,
    taw_mm: taw,
    raw_mm: raw,
    etc,
    coach,
    habit,
    habit_net_mm_per_day: habitNet,
    coach_cum_m3: cum(coach),
    habit_cum_m3: cum(habit),
    coach_pump_hours: coach.gross_litres / flowLpm / 60,
    habit_pump_hours: habit.gross_litres / flowLpm / 60,
  };
}

/** The idea doc's habit: 10 mm into the soil every day, expressed as pump minutes for this plot. */
export function docHabitMinutes(area: number, efficiency: number, flowLpm: number): number {
  return (10 * area) / efficiency / flowLpm;
}
