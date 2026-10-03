import cropsJson from '../../contracts/data/crops.json';
import methodsJson from '../../contracts/data/methods.json';
import type { CropParams, MethodId, MethodParams } from './types';

export const CROPS: readonly CropParams[] = cropsJson.crops as CropParams[];
export const METHODS: readonly MethodParams[] = methodsJson.methods as MethodParams[];

export function getCrop(id: string): CropParams {
  const c = CROPS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown crop '${id}'`);
  return c;
}

export function findCrop(id: string): CropParams | undefined {
  return CROPS.find((x) => x.id === id);
}

export function getMethod(id: MethodId): MethodParams {
  const m = METHODS.find((x) => x.id === id);
  if (!m) throw new Error(`unknown method '${id}'`);
  return m;
}
