// FAO-56 chapter 6: single crop coefficient curve.
import type { CropParams, CropStage } from '../types';

export function stageForDay(crop: CropParams, daysSincePlanting: number): CropStage {
  const s = crop.stage_days;
  if (daysSincePlanting < s.ini) return 'ini';
  if (daysSincePlanting < s.ini + s.dev) return 'dev';
  if (daysSincePlanting < s.ini + s.dev + s.mid) return 'mid';
  return 'late';
}

/** Kc on a given day after planting, with linear interpolation in dev and late stages (FAO-56 eq. 66). */
export function kcForDay(crop: CropParams, daysSincePlanting: number): number {
  const { ini, dev, mid, late } = crop.stage_days;
  const { kc } = crop;
  const d = Math.max(0, daysSincePlanting);
  if (d <= ini) return kc.ini;
  if (d <= ini + dev) return kc.ini + ((d - ini) / dev) * (kc.mid - kc.ini);
  if (d <= ini + dev + mid) return kc.mid;
  if (d <= ini + dev + mid + late) return kc.mid + ((d - ini - dev - mid) / late) * (kc.end - kc.mid);
  return kc.end;
}

/** Representative Kc when only the stage is known (farmer-reported, no planting date). */
export function kcForStage(crop: CropParams, stage: CropStage): number {
  const { kc } = crop;
  switch (stage) {
    case 'ini':
      return kc.ini;
    case 'dev':
      return (kc.ini + kc.mid) / 2;
    case 'mid':
      return kc.mid;
    case 'late':
      return (kc.mid + kc.end) / 2;
  }
}
